import { beforeEach, expect, it, vi } from "vite-plus/test";
import type { ExecutionContext } from "@cloudflare/workers-types";
import worker from "../../src/worker";
import { type WorkerEnv } from "../../src/runtime/env";

vi.mock("../../src/app", () => ({
  buildApp: () => ({
    fetch: async (request: Request) =>
      Response.json({ path: new URL(request.url).pathname }, { status: 404 }),
  }),
}));

const fetchAsset = vi.fn();
const env: WorkerEnv = {
  DB: {} as WorkerEnv["DB"],
  SERVE_FRONTEND: "true",
  ASSETS: { fetch: fetchAsset } as unknown as WorkerEnv["ASSETS"],
};
const context = {} as ExecutionContext;
const files = new Map([
  ["/site/index.html", "app"],
  ["/site/oauth-callback.html", "callback"],
  ["/site/js/app.js", "script"],
  ["/site/js/app.B1hq0Fcs.js", "hashed script"],
  ["/site/webfonts/Geist-Medium.woff2", "font"],
  ["/site/languages/english.json", "words"],
  ["/site/release.json", "[]"],
  ["/configure/private.json", "private"],
]);
beforeEach(() => {
  fetchAsset
    .mockReset()
    .mockImplementation(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      const content = files.get(path);
      return new Response(init.method === "HEAD" ? null : content, {
        status: content === undefined ? 404 : 200,
        headers: {
          "Content-Type": path.endsWith(".html")
            ? "text/html"
            : "application/javascript",
        },
      });
    });
});
async function request(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return await worker.fetch(
    new Request(`https://staging.example${path}`, init),
    env,
    context,
  );
}
it.each(["/", "/login", "/profile/typer"])(
  "serves app navigation at %s",
  async (path) => {
    const response = await request(path, { headers: { accept: "text/html" } });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("app");
    expect(response.headers.get("cache-control")).toBe("no-store");
  },
);
it.each(["/oauth-callback", "/oauth-callback.html"])(
  "serves the standalone callback at %s",
  async (path) => {
    const response = await request(`${path}?requestId=nonce`, {
      headers: { accept: "text/html" },
    });
    expect(await response.text()).toBe("callback");
    expect(new URL(fetchAsset.mock.lastCall?.[0] as string).search).toBe(
      "?requestId=nonce",
    );
  },
);
it("keeps unknown API requests out of the SPA fallback", async () => {
  const response = await request("/api/unknown", {
    headers: { accept: "text/html" },
  });
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ path: "/unknown" });
  expect(fetchAsset).not.toHaveBeenCalled();
});
it("keeps legacy API routing when frontend hosting is disabled", async () => {
  const response = await worker.fetch(
    new Request("https://staging.example/configuration"),
    { ...env, SERVE_FRONTEND: "false" },
    context,
  );
  expect(await response.json()).toEqual({ path: "/configuration" });
  expect(fetchAsset).not.toHaveBeenCalled();
});
it("returns missing files and private backend assets as 404", async () => {
  for (const path of [
    "/js/missing.js",
    "/configure/private.json",
    "/%2f../configure/private.json",
  ]) {
    expect(
      (await request(path, { headers: { accept: "text/html" } })).status,
    ).toBe(404);
  }
});
it("serves HEAD without a body and rejects mutations", async () => {
  expect(await (await request("/js/app.js", { method: "HEAD" })).text()).toBe(
    "",
  );
  const response = await request("/login", { method: "POST" });
  expect(response.status).toBe(405);
  expect(response.headers.get("allow")).toBe("GET, HEAD");
});
it("serves the release snapshot without retaining an older deployment", async () => {
  const initial = await request("/release.json");
  expect(initial.status).toBe(200);
  expect(await initial.json()).toEqual([]);
  expect(initial.headers.get("cache-control")).toBe("no-store");

  fetchAsset.mockResolvedValueOnce(
    Response.json([{ name: "new release" }], {
      headers: { "Cache-Control": "public, max-age=31536000" },
    }),
  );
  const latest = await request("/release.json");
  expect(await latest.json()).toEqual([{ name: "new release" }]);
  expect(latest.headers.get("cache-control")).toBe("no-store");
  const head = await request("/release.json", { method: "HEAD" });
  expect(await head.text()).toBe("");
  expect(head.headers.get("cache-control")).toBe("no-store");
});
it("caches content-hashed build assets as immutable", async () => {
  const hashed = await request("/js/app.B1hq0Fcs.js");
  expect(await hashed.text()).toBe("hashed script");
  expect(hashed.headers.get("cache-control")).toBe(
    "public, max-age=31536000, immutable",
  );
  for (const path of ["/js/app.js", "/webfonts/Geist-Medium.woff2"]) {
    expect((await request(path)).headers.get("cache-control")).toBeNull();
  }
  expect(
    (await request("/languages/english.json?v=0123456789abcdef")).headers.get(
      "cache-control",
    ),
  ).toBe("public, max-age=31536000, immutable");
  expect(
    (await request("/languages/english.json")).headers.get("cache-control"),
  ).toBeNull();
  const missing = await request("/js/missing.B1hq0Fcs.js");
  expect(missing.headers.get("cache-control")).toBeNull();
});
it("fails clearly when the assets binding is absent", async () => {
  const response = await worker.fetch(
    new Request("https://staging.example/login"),
    { ...env, ASSETS: undefined },
    context,
  );
  expect(response.status).toBe(503);
});
