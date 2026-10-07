import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { parse } from "yaml";
import { getReleaseVersion } from "../src/version.js";

const workflow = parse(
  readFileSync(
    new URL(
      "../../../.github/workflows/publish-docker-images.yml",
      import.meta.url,
    ),
    "utf8",
  ),
);
const metadata = workflow.jobs.publish.steps.find(
  (step) => step.id === "frontend-meta",
);
const rule = metadata.with.tags
  .split("\n")
  .find((line) => line.startsWith("type=match,"));
const match = /pattern=(.+),group=(\d+),value=/.exec(rule);
if (match === null) throw new Error("Missing Docker release version rule");
const pattern = new RegExp(match[1]);
const group = Number(match[2]);

describe("Docker release versions", () => {
  it.each([
    ["2026-10-07T00:17:00Z", "26.10.07"],
    ["2006-01-01T00:17:00Z", "06.01.01"],
    ["2027-01-01T00:00:00Z", "27.01.01"],
  ])("uses generated release %s as image version %s", (date, version) => {
    expect(pattern.exec(getReleaseVersion(new Date(date)))?.[group]).toBe(
      version,
    );
  });

  it.each(["v2026.10.07", "v26.32.0", "main"])(
    "excludes incompatible version %s",
    (version) => {
      expect(pattern.test(version)).toBe(false);
    },
  );

  it("supports both release events and manually selected tags", () => {
    expect(rule).toContain("github.event.release.tag_name || github.ref_name");
    expect(metadata.with.tags).toContain("type=raw,value=latest");
  });
});
