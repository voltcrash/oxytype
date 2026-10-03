import { wrapUnitApp } from "../setup-tests";
import { beforeAll, afterAll, describe, expect, it, vi } from "vite-plus/test";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { ApiEnv } from "../../src/api/http";
import { Hono } from "hono";

let app: Hono<ApiEnv>;
let docsRoot: string;
beforeAll(async () => {
  vi.stubEnv("API_PATH_OVERRIDE", "v1");
  docsRoot = await mkdtemp(join(tmpdir(), "oxytype-hono-prefix-"));
  await writeFile(
    join(docsRoot, "public.html"),
    "<!doctype html><title>API</title>",
  );
  const { buildApp } = await import("../../src/app.js");
  app = wrapUnitApp(buildApp({ docsRoot }));
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(docsRoot, { recursive: true, force: true });
});

describe("API_PATH_OVERRIDE", () => {
  it("prefixes docs, retaining case-insensitive and trailing-slash matching", async () => {
    for (const path of ["/v1/docs", "/v1/docs/", "/V1/DOCS/PUBLIC"]) {
      const response = await app.request(path);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("<title>API</title>");
      expect(response.headers.get("content-security-policy")).toContain(
        "cdn.redocly.com",
      );
    }
    expect((await app.request("/docs")).status).toBe(404);
  });
  it("keeps existing contract and health paths", async () => {
    expect((await app.request("/")).status).toBe(200);
    expect((await app.request("/configuration")).status).toBe(200);
    expect((await app.request("/v1/configuration")).status).toBe(404);
  });
  it("returns a controlled 404 for a missing documentation file", async () => {
    const response = await app.request("/v1/docs/internal.json");
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      message: "API documentation file not found",
    });
  });
});
