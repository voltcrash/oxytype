import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { parseEnv } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { parse } from "yaml";
import {
  prepareDailyRelease,
  publishDailyRelease,
} from "../src/daily-release.js";

const marker = "<!-- oxytype-production-release -->";

describe("daily production releases", () => {
  let cwd;
  let github;
  let context;

  function git(...args) {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  }

  function commit(subject, date) {
    execFileSync("git", ["commit", "--quiet", "--allow-empty", "-m", subject], {
      cwd,
      env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
    });
    context.sha = git("rev-parse", "HEAD");
    return context.sha;
  }

  function previousRelease(tag = "v2026.10.04") {
    git("tag", tag);
    github.paginate.mockResolvedValue([
      {
        tag_name: tag,
        name: tag.slice(1),
        published_at: `${tag.slice(1).replaceAll(".", "-")}T00:17:00Z`,
        body: marker,
        draft: false,
        prerelease: false,
      },
    ]);
  }

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "oxytype-daily-release-"));
    git("init", "--quiet", "--initial-branch=main");
    git("config", "user.name", "Release Tests");
    git("config", "user.email", "release-tests@example.com");
    git("config", "commit.gpgsign", "false");
    git("config", "tag.gpgsign", "false");
    context = {
      repo: { owner: "voltcrash", repo: "oxytype" },
      runId: 42,
      eventName: "schedule",
      sha: "",
    };
    github = {
      paginate: vi.fn().mockResolvedValue([]),
      rest: {
        actions: {
          getWorkflowRun: vi.fn().mockResolvedValue({
            data: { created_at: "2026-10-05T00:02:00Z" },
          }),
        },
        repos: {
          listReleases: vi.fn(),
          createRelease: vi
            .fn()
            .mockResolvedValue({ data: { name: "2026.10.05" } }),
        },
      },
    };
    commit("old inherited history", "2026-10-03T12:00:00Z");
  });

  afterEach(() => {
    vi.useRealTimers();
    rmSync(cwd, { recursive: true, force: true });
  });

  it("dates retries from the original run, even after midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T01:00:00Z"));
    const plan = await prepareDailyRelease({ github, context, cwd });
    expect(plan.version).toBe("2026.10.05");
    expect(plan.tag).toBe("v2026.10.05");
    expect(github.rest.repos.createRelease).not.toHaveBeenCalled();
  });

  it("includes the preceding day's midnight boundary in the first scheduled release", async () => {
    commit("merged at midnight", "2026-10-04T00:00:00Z");
    commit("merged before deployment", "2026-10-04T23:59:59Z");
    const plan = await prepareDailyRelease({ github, context, cwd });
    expect(plan.body).toContain("### Nerd stuff");
    expect(plan.body).toContain("merged at midnight");
    expect(plan.body).toContain("merged before deployment");
    expect(plan.body).not.toContain("old inherited history");
  });

  it("uses today's changes for the first manual release", async () => {
    context.eventName = "workflow_dispatch";
    commit("yesterday's change", "2026-10-04T22:00:00Z");
    commit("today's change", "2026-10-05T00:01:00Z");
    const plan = await prepareDailyRelease({ github, context, cwd });
    expect(plan.body).toContain("today's change");
    expect(plan.body).not.toContain("yesterday's change");
  });

  it("includes old-authored branch commits merged today and direct main commits", async () => {
    previousRelease();
    git("checkout", "--quiet", "-b", "feature");
    commit("old-authored feature", "2026-09-01T12:00:00Z");
    git("checkout", "--quiet", "main");
    commit("direct main change", "2026-10-04T20:00:00Z");
    execFileSync(
      "git",
      ["merge", "--quiet", "--no-ff", "feature", "-m", "Merge feature (#7)"],
      {
        cwd,
        env: { ...process.env, GIT_COMMITTER_DATE: "2026-10-04T23:00:00Z" },
      },
    );
    context.sha = git("rev-parse", "HEAD");
    const plan = await prepareDailyRelease({ github, context, cwd });
    for (const text of [
      "old-authored feature",
      "direct main change",
      "Merge feature ([#7]",
    ]) {
      expect(plan.body).toContain(text);
    }
    expect(plan.body).toContain(`/compare/v2026.10.04...${context.sha}`);
    expect(plan.body).not.toContain("old inherited history");
  });

  it("catches up changes since the last production release after a missed day", async () => {
    previousRelease("v2026.10.03");
    commit("missed-day change", "2026-10-03T22:00:00Z");
    commit("latest change", "2026-10-04T22:00:00Z");
    const plan = await prepareDailyRelease({ github, context, cwd });
    expect(plan.body).toContain("missed-day change");
    expect(plan.body).toContain("latest change");
  });

  it("still deploys and publishes on days without changes", async () => {
    previousRelease();
    const plan = await prepareDailyRelease({ github, context, cwd });
    expect(plan.shouldDeploy).toBe(true);
    expect(plan.body).toContain("No new changes merged to main");
  });

  it("bundles the new release's exact notes before GitHub publication", async () => {
    previousRelease();
    commit("fix: repair version history", "2026-10-04T22:00:00Z");
    const plan = await prepareDailyRelease({ github, context, cwd });
    expect(plan.releaseHistory).toEqual([
      {
        tag_name: plan.tag,
        name: plan.version,
        published_at: "2026-10-05T00:02:00.000Z",
        body: plan.body,
      },
      {
        tag_name: "v2026.10.04",
        name: "2026.10.04",
        published_at: "2026-10-04T00:17:00Z",
        body: marker,
      },
    ]);
    expect(github.rest.repos.createRelease).not.toHaveBeenCalled();
  });

  it("keeps the new release and only nine older public releases", async () => {
    const older = Array.from({ length: 15 }, (_, i) => ({
      tag_name: `v2026.09.${String(i + 1).padStart(2, "0")}`,
      published_at: new Date(Date.UTC(2026, 8, i + 1)).toISOString(),
      body: "Older notes",
      draft: false,
      prerelease: false,
    }));
    github.paginate.mockResolvedValue([
      { ...older[0], tag_name: "draft", draft: true },
      { ...older[0], tag_name: "preview", prerelease: true },
      ...older,
    ]);
    const plan = await prepareDailyRelease({ github, context, cwd });
    expect(plan.releaseHistory.map((release) => release.tag_name)).toEqual([
      plan.tag,
      ...older
        .slice(-9)
        .reverse()
        .map((release) => release.tag_name),
    ]);
  });

  it("skips an already published production release on same-day retries", async () => {
    previousRelease("v2026.10.05");
    const plan = await prepareDailyRelease({ github, context, cwd });
    expect(plan.shouldDeploy).toBe(false);
  });

  it.each([
    { body: "manual staging release", draft: false, prerelease: false },
    { body: marker, draft: true, prerelease: false },
    { body: marker, draft: false, prerelease: true },
  ])(
    "rejects a colliding release that was not a completed production deployment",
    async (release) => {
      github.paginate.mockResolvedValue([
        { tag_name: "v2026.10.05", ...release },
      ]);
      await expect(
        prepareDailyRelease({ github, context, cwd }),
      ).rejects.toThrow("outside the daily deployment");
    },
  );

  it("refuses an older failed run after a newer production release", async () => {
    previousRelease("v2026.10.06");
    await expect(prepareDailyRelease({ github, context, cwd })).rejects.toThrow(
      "newer production release",
    );
  });

  it("rejects a date tag pointing at another commit", async () => {
    git("tag", "v2026.10.05");
    commit("new change", "2026-10-04T22:00:00Z");
    await expect(prepareDailyRelease({ github, context, cwd })).rejects.toThrow(
      "different commit",
    );
  });

  it("allows retrying release publication when the date tag already matches the snapshot", async () => {
    git("tag", "v2026.10.05");
    const plan = await prepareDailyRelease({ github, context, cwd });
    expect(plan.shouldDeploy).toBe(true);
  });

  it("refuses a checkout different from the run's main snapshot", async () => {
    context.sha = "wrong-sha";
    await expect(prepareDailyRelease({ github, context, cwd })).rejects.toThrow(
      "workflow's main commit",
    );
  });

  it("escapes commit subjects so release notes cannot inject Markdown", async () => {
    previousRelease();
    commit(
      "fix [link](https://example.com) <img> `code`",
      "2026-10-04T22:00:00Z",
    );
    const plan = await prepareDailyRelease({ github, context, cwd });
    expect(plan.body).toContain(
      "fix \\[link\\](https://example.com) \\<img\\> \\`code\\`",
    );
  });

  it("publishes the exact deployed SHA with a padded date title and v-prefixed tag", async () => {
    const plan = await prepareDailyRelease({ github, context, cwd });
    await publishDailyRelease({ github, context, ...plan });
    expect(github.rest.repos.createRelease).toHaveBeenCalledWith({
      ...context.repo,
      tag_name: "v2026.10.05",
      target_commitish: context.sha,
      name: "2026.10.05",
      body: plan.body,
      draft: false,
      prerelease: false,
      make_latest: "true",
    });
  });
});

it("wires scheduled/manual production deployment before publication and always cleans credentials", () => {
  const path = fileURLToPath(
    new URL(
      "../../../.github/workflows/daily-production-release.yml",
      import.meta.url,
    ),
  );
  const workflow = parse(readFileSync(path, "utf8"));
  expect(workflow.on.schedule).toEqual([{ cron: "17 0 * * *" }]);
  expect(workflow.on).toHaveProperty("workflow_dispatch");
  expect(workflow.concurrency["cancel-in-progress"]).toBe(false);
  const job = workflow.jobs.release;
  expect(job.if).toContain("github.ref == 'refs/heads/main'");
  expect(job.environment.name).toBe("production");
  const steps = job.steps;
  const deploy = steps.findIndex(
    (step) => step.name === "Deploy production with Wrangler",
  );
  const publish = steps.findIndex(
    (step) => step.name === "Publish GitHub release after deployment",
  );
  expect(deploy).toBeGreaterThan(
    steps.findIndex((step) => step.name === "Apply production D1 migrations"),
  );
  expect(publish).toBeGreaterThan(deploy);
  expect(steps[deploy].run).toContain(
    'deploy:production-site --var "VERSION:$RELEASE_VERSION"',
  );
  expect(steps[publish].if).toBe("steps.plan.outputs.shouldDeploy == 'true'");
  expect(steps.at(-1).if).toBe("always()");
});

it.each(["", "ba_dashboard_workflow_fixture"])(
  "materializes the optional dashboard key only into the private backend file (%s)",
  (apiKey) => {
    const workflow = parse(
      readFileSync(
        fileURLToPath(
          new URL(
            "../../../.github/workflows/daily-production-release.yml",
            import.meta.url,
          ),
        ),
        "utf8",
      ),
    );
    const settings = workflow.jobs.release.steps.find(
      (step) =>
        step.name === "Prepare production credentials and build settings",
    );
    expect(settings.env.BETTER_AUTH_API_KEY).toBe(
      "${{ secrets.BETTER_AUTH_API_KEY }}",
    );
    const script = settings.run.match(/<<'NODE'\n([\s\S]+)\nNODE/)?.[1];
    if (script === undefined) {
      throw new Error("Missing production settings script");
    }
    const directory = mkdtempSync(
      join(tmpdir(), "oxytype-dashboard-settings-"),
    );
    try {
      mkdirSync(join(directory, "backend"));
      mkdirSync(join(directory, "frontend"));
      writeFileSync(
        join(directory, "package.json"),
        JSON.stringify({ version: "old" }),
      );
      const frontend =
        "BACKEND_URL=/api\nTURNSTILE_SITE_KEY=public-fixture\nAUTH_PROVIDERS=github\n";
      execFileSync(process.execPath, ["--input-type=module"], {
        cwd: directory,
        input: script,
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: "cloudflare-fixture",
          PRODUCTION_BACKEND_ENV:
            "BETTER_AUTH_SECRET=auth-secret-fixture\nBETTER_AUTH_API_KEY=existing-dashboard-key\n",
          BETTER_AUTH_API_KEY: apiKey,
          PRODUCTION_FRONTEND_ENV: frontend,
          RELEASE_VERSION: "2026.10.04",
        },
      });
      const backendPath = join(directory, "backend/.dev.vars.production");
      const backend = parseEnv(readFileSync(backendPath, "utf8"));
      expect(backend.BETTER_AUTH_SECRET).toBe("auth-secret-fixture");
      expect(backend.BETTER_AUTH_API_KEY).toBe(
        apiKey || "existing-dashboard-key",
      );
      expect(statSync(backendPath).mode & 0o777).toBe(0o600);
      expect(
        readFileSync(join(directory, "frontend/.env.production.local"), "utf8"),
      ).toBe(frontend);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
