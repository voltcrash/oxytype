import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import request from "supertest";
import { ApiMiddleware } from "../src/api/http";
import { IncomingMessage } from "http";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { getRequestListener } from "@hono/node-server";
import { gzipSync } from "zlib";
import { buildApp } from "../src/app";
import { BASE_CONFIGURATION } from "../src/constants/base-configuration";
import {
  COMPATIBILITY_CHECK,
  COMPATIBILITY_CHECK_HEADER,
} from "@oxytype/contracts";
import * as Configuration from "../src/init/configuration";
import * as UserDal from "../src/dal/user";
import MonkeyError from "../src/utils/error";
import { MAX_BODY_SIZE } from "../src/middlewares/body";
import {
  createRateLimiter,
  getIpKey,
  REQUEST_MULTIPLIER,
} from "../src/middlewares/rate-limit";

let configuration = structuredClone(BASE_CONFIGURATION);
let docsRoot: string;
beforeAll(async () => {
  docsRoot = await mkdtemp(join(tmpdir(), "oxytype-hono-docs-"));
  await Promise.all([
    writeFile(
      join(docsRoot, "internal.html"),
      "<!doctype html><title>Internal API</title>",
    ),
    writeFile(
      join(docsRoot, "public.html"),
      "<!doctype html><title>Public API</title>",
    ),
    writeFile(
      join(docsRoot, "openapi.json"),
      JSON.stringify({ openapi: "3.0.2" }),
    ),
    writeFile(
      join(docsRoot, "public.json"),
      JSON.stringify({ openapi: "3.0.2" }),
    ),
  ]);
});
afterAll(async () => {
  await rm(docsRoot, { recursive: true, force: true });
});
beforeEach(() => {
  vi.stubEnv("FRONTEND_URL", "http://localhost:3000");
  configuration = structuredClone(BASE_CONFIGURATION);
  vi.spyOn(Configuration, "getCachedConfiguration").mockResolvedValue(
    configuration,
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function createClient(): ReturnType<typeof request> {
  const app = buildApp({ docsRoot });
  app.get("/probe", (c) =>
    c.json({ message: "probe", data: { ip: c.get("request").ip } }),
  );
  app.post("/probe", (c) => c.json({ data: c.get("request").body }));
  app.get("/custom-error", () => {
    throw new MonkeyError(479, "ApeKey rate limit exceeded");
  });
  app.get("/server-error", () => {
    throw new Error("private error details");
  });
  app.get(
    "/limited",
    createRateLimiter({ max: 1 / REQUEST_MULTIPLIER, window: "second" }),
    (c) => c.json({ ok: true }),
  );
  const apeAuthentication: ApiMiddleware = async (c, next) => {
    c.get("request").ctx.decodedToken = {
      type: "ApeKey",
      uid: "ape",
      email: "",
    };
    await next();
  };
  app.get(
    "/ape-limited",
    apeAuthentication,
    createRateLimiter({ max: 1 / REQUEST_MULTIPLIER, window: "second" }),
    (c) => c.json({ ok: true }),
  );
  return request(getRequestListener(app.fetch));
}

async function postBytes(
  client: ReturnType<typeof request>,
  body: Buffer,
  status: number,
  encoding?: string,
): Promise<request.Response> {
  const test = client.post("/probe").type("json").expect(status);
  if (encoding !== undefined) test.set("Content-Encoding", encoding);
  return new Promise((resolve, reject) => {
    test.write(body);
    test.end((error: Error | null, response: request.Response) => {
      if (error !== null) reject(error);
      else resolve(response);
    });
  });
}

describe("Hono HTTP application", () => {
  it("serves health, compatibility, CORS, security and limiter headers", async () => {
    const response = await createClient()
      .get("/")
      .set("Origin", "http://localhost:3000")
      .expect(200);
    expect(response.body).toEqual({
      message: "ok",
      data: { uptime: expect.any(Number), version: expect.any(String) },
    });
    expect(response.headers[COMPATIBILITY_CHECK_HEADER.toLowerCase()]).toBe(
      String(COMPATIBILITY_CHECK),
    );
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(response.headers["access-control-expose-headers"]).toContain(
      COMPATIBILITY_CHECK_HEADER,
    );
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["x-ratelimit-limit"]).toBe(
      String(1000 * REQUEST_MULTIPLIER),
    );
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["content-type"]).toBe(
      "application/json; charset=utf-8",
    );
  });
  it("answers preflight before authentication and maintenance", async () => {
    vi.stubEnv("MAINTENANCE", "true");
    const response = await createClient()
      .options("/users")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type")
      .expect(204);
    expect(response.headers["access-control-allow-methods"]).toBe(
      "GET,HEAD,PUT,PATCH,POST,DELETE",
    );
    expect(response.headers["access-control-allow-headers"]).toBe(
      "authorization,content-type",
    );
    expect(response.text).toBe("");
  });
  it("does not grant cross-origin access to untrusted sites", async () => {
    const response = await createClient()
      .get("/")
      .set("Origin", "https://attacker.example")
      .expect(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
  it("uses the existing unknown-route envelope", async () => {
    const response = await createClient().get("/unknown?query=1").expect(404);
    expect(response.body).toEqual({
      message: "Unknown request URL (GET: /unknown)",
      data: null,
    });
  });
  it("keeps configuration and stats available during maintenance", async () => {
    configuration.maintenance = true;
    const client = createClient();
    await client
      .get("/")
      .expect(503, { message: "Server is down for maintenance" });
    await client.get("/configuration").expect(200);
    await client.get("/stats/swagger-stats").expect(200);
  });
  it("honors environment maintenance", async () => {
    vi.stubEnv("MAINTENANCE", "true");
    await createClient().get("/probe").expect(503);
  });
  it("handles HEAD with the same headers and no response body", async () => {
    const client = createClient();
    const get = await client.get("/probe").expect(200);
    const head = await client.head("/probe").expect(200);
    expect(head.headers["etag"]).toBe(get.headers["etag"]);
    expect(head.text).toBeUndefined();
  });
  it("keeps compatibility-prefixed weak ETags and handles conditional requests", async () => {
    const client = createClient();
    const response = await client.get("/probe").expect(200);
    expect(response.headers["etag"]).toMatch(
      new RegExp(`^W/"V${COMPATIBILITY_CHECK}-`),
    );
    const etag = response.headers["etag"] as string;
    for (const tag of [
      etag,
      etag.replace(/^W\//, ""),
      "*",
      `"other", ${etag}`,
    ]) {
      const cached = await client
        .get("/probe")
        .set("If-None-Match", tag)
        .expect(304);
      expect(cached.text).toBe("");
      expect(cached.headers["content-type"]).toBeUndefined();
      expect(cached.headers["etag"]).toBe(response.headers["etag"]);
    }
    await client.head("/probe").set("If-None-Match", etag).expect(304);
    await client.get("/probe").set("If-None-Match", 'W/"V0-stale"').expect(200);
    await client
      .get("/probe")
      .set("If-None-Match", etag)
      .set("Cache-Control", "no-cache")
      .expect(200);
    await client.post("/probe").set("If-None-Match", "*").send({}).expect(200);
  });
  it("parses JSON, nested forms, and empty bodies", async () => {
    const client = createClient();
    await client
      .post("/probe")
      .send({ nested: { value: 42 } })
      .expect(200, { data: { nested: { value: 42 } } });
    await client
      .post("/probe")
      .type("form")
      .send("nested[value]=42&values[]=a&values[]=b")
      .expect(200, { data: { nested: { value: "42" }, values: ["a", "b"] } });
    await client.post("/probe").expect(200, { data: {} });
    await client.post("/probe").type("json").send("").expect(200, { data: {} });
  });
  it.each(["{broken", "true", '"text"'])(
    "rejects malformed/primitive JSON: %s",
    async (body) => {
      const response = await createClient()
        .post("/probe")
        .type("json")
        .send(body)
        .expect(400);
      expect(response.body.message).toBe("Unprocessable request");
      expect(response.body.data.errorId).toBeUndefined();
    },
  );
  it("enforces size limits for declared and streamed bodies", async () => {
    const client = createClient();
    const body = JSON.stringify({ value: "x".repeat(MAX_BODY_SIZE) });
    await client.post("/probe").type("json").send(body).expect(413);
    await postBytes(client, Buffer.from(body), 413);
  });
  it("parses gzip JSON and caps decompressed bodies", async () => {
    const client = createClient();
    const response = await postBytes(
      client,
      gzipSync('{"value":42}'),
      200,
      "gzip",
    );
    expect(response.body).toEqual({ data: { value: 42 } });
    await postBytes(
      client,
      gzipSync(JSON.stringify({ value: "x".repeat(MAX_BODY_SIZE) })),
      413,
      "gzip",
    );
    await postBytes(client, Buffer.from("invalid"), 400, "gzip");
  });
  it("rejects unsupported encodings and charsets", async () => {
    const client = createClient();
    await client
      .post("/probe")
      .type("json")
      .set("Content-Encoding", "unknown")
      .send("{}")
      .expect(415);
    await client
      .post("/probe")
      .set("Content-Type", "application/json; charset=iso-8859-1")
      .send("{}")
      .expect(415);
  });
  it("checks authentication before schema validation", async () => {
    await createClient()
      .post("/connections")
      .send({ invalid: true })
      .expect(401);
  });
  it("accepts trailing slashes on contract routes", async () => {
    await createClient().get("/configuration/").expect(200);
    await createClient().post("/connections/").expect(401);
  });
  it("keeps static route matching case-insensitive and preserves parameter case", async () => {
    const client = createClient();
    await client.get("/CONFIGURATION/").expect(200);
    const name = vi.spyOn(UserDal, "isNameAvailable").mockResolvedValue(true);
    await client.get("/USERS/CHECKNAME/MixedCaseName").expect(200);
    expect(name).toHaveBeenCalledWith("MixedCaseName", "");
  });
  it("preserves custom status and Node reason phrases", async () => {
    const response = await createClient().get("/custom-error").expect(479);
    expect(response.body).toEqual({
      message: "ApeKey rate limit exceeded",
      data: { uid: "" },
    });
    expect(
      (response as unknown as { res: IncomingMessage }).res.statusMessage,
    ).toBe("ApeKey rate limit exceeded");
  });
  it("hides unexpected error details behind an error ID", async () => {
    const response = await createClient().get("/server-error").expect(500);
    expect(response.body.data.errorId).toEqual(expect.any(String));
    expect(response.body.message).toContain(response.body.data.errorId);
    expect(response.text).not.toContain("private error details");
  });
  it("uses the immediate proxy client and gives Cloudflare precedence", async () => {
    const client = createClient();
    const proxy = await client
      .get("/probe")
      .set("X-Forwarded-For", "198.51.100.1, 203.0.113.2")
      .expect(200);
    expect(proxy.body.data.ip).toBe("203.0.113.2");
    const cloudflare = await client
      .get("/probe")
      .set("X-Forwarded-For", "203.0.113.2")
      .set("CF-Connecting-IP", "192.0.2.1")
      .expect(200);
    expect(cloudflare.body.data.ip).toBe("192.0.2.1");
    expect(getIpKey("2001:db8:1234:5600::1")).toBe(
      getIpKey("2001:db8:1234:56ff::2"),
    );
    expect(getIpKey("2001:db8:1234:5700::1")).not.toBe(
      getIpKey("2001:db8:1234:5600::1"),
    );
  });
  it("enforces IP budgets and reports remaining/reset/retry headers", async () => {
    const client = createClient();
    const first = await client
      .get("/limited")
      .set("CF-Connecting-IP", "192.0.2.10")
      .expect(200);
    expect(first.headers["x-ratelimit-limit"]).toBe("1");
    expect(first.headers["x-ratelimit-remaining"]).toBe("0");
    const limited = await client
      .get("/limited")
      .set("CF-Connecting-IP", "192.0.2.10")
      .expect(429);
    expect(limited.headers["retry-after"]).toBe("1");
    expect(Number(limited.headers["x-ratelimit-reset"])).toBeGreaterThanOrEqual(
      Math.floor(Date.now() / 1000),
    );
    await client
      .get("/limited")
      .set("CF-Connecting-IP", "192.0.2.11")
      .expect(200);
  });
  it("shares UID budgets across IPs and uses ApeKey status 479", async () => {
    const client = createClient();
    await client
      .get("/ape-limited")
      .set("CF-Connecting-IP", "192.0.2.12")
      .expect(200);
    await client
      .get("/ape-limited")
      .set("CF-Connecting-IP", "192.0.2.13")
      .expect(479);
  });
  it("applies bad-auth penalties to later requests", async () => {
    const client = createClient();
    configuration.rateLimiting.badAuthentication.enabled = true;
    configuration.rateLimiting.badAuthentication.flaggedStatusCodes = [401];
    configuration.rateLimiting.badAuthentication.penalty =
      30 * REQUEST_MULTIPLIER;
    await client
      .get("/users")
      .set("CF-Connecting-IP", "192.0.2.20")
      .expect(401);
    const response = await client
      .get("/")
      .set("CF-Connecting-IP", "192.0.2.20")
      .expect(429);
    expect(response.body.message).toContain(
      "Too many bad authentication attempts",
    );
  });
  it("returns 404 for retired Discord and bot announcement endpoints", async () => {
    const client = createClient();
    await client.get("/users/discord/oauth").expect(404);
    for (const path of [
      "/users/discord/link",
      "/users/discord/unlink",
      "/webhooks/githubRelease",
    ]) {
      await client.post(path).send({}).expect(404);
    }
  });
  it("serves stats and all Prometheus metrics in development", async () => {
    const client = createClient();
    await client.get("/probe").expect(200);
    const stats = await client.get("/stats/swagger-stats").expect(200);
    expect(stats.body.requests).toBeGreaterThan(0);
    expect(stats.body.averageDurationMs).toBeGreaterThanOrEqual(0);
    await client.get("/stats").expect(302).expect("Location", "/stats/ui");
    await client.get("/stats/ui").expect(200).expect("Content-Type", /html/);
    const metrics = await client.get("/stats/metrics").expect(200);
    expect(metrics.text).toContain("api_http_requests_total");
    expect(metrics.text).toContain("api_http_request_duration_seconds");
    expect(metrics.text).toContain("api_request_auth_total");
  });
  it("protects every stats endpoint in production, including maintenance", async () => {
    vi.stubEnv("MODE", "prod");
    vi.stubEnv("STATS_USERNAME", "admin");
    vi.stubEnv("STATS_PASSWORD", "secret");
    configuration.maintenance = true;
    const client = createClient();
    for (const path of [
      "/stats",
      "/stats/ui",
      "/stats/swagger-stats",
      "/stats/metrics",
      "/stats/swagger.json",
    ]) {
      await client.get(path).expect(401).expect("WWW-Authenticate", /Basic/);
      await client.get(path).auth("admin", "wrong").expect(401);
    }
    await client.get("/stats/metrics").auth("admin", "secret").expect(200);
  });
  it("serves docs with the Redoc CSP in development and production", async () => {
    for (const mode of ["dev", "prod"]) {
      vi.stubEnv("MODE", mode);
      const client = createClient();
      for (const path of [
        "/docs",
        "/docs/",
        "/docs/public",
        "/docs/internal",
      ]) {
        const doc = await client
          .get(path)
          .expect(200)
          .expect("Content-Type", /html/);
        expect(doc.headers["content-security-policy"]).toContain(
          "cdn.redocly.com",
        );
      }
      for (const path of ["/docs/public.json", "/docs/internal.json"]) {
        const doc = await client
          .get(path)
          .expect(200)
          .expect("Content-Type", /json/);
        expect(doc.body.openapi).toEqual(expect.any(String));
      }
    }
  });
  it("keeps static GET/HEAD validators and date/range responses consistent", async () => {
    const client = createClient();
    const get = await client.get("/docs/public").expect(200);
    const tag = get.headers["etag"] as string;
    const modified = get.headers["last-modified"] as string;
    const head = await client.head("/docs/public").expect(200);
    expect(head.headers["etag"]).toBe(tag);
    expect(head.headers["last-modified"]).toBe(modified);
    expect(head.headers["cache-control"]).toBe("public, max-age=0");
    await client.get("/docs/public").set("If-None-Match", tag).expect(304);
    await client.head("/docs/public").set("If-None-Match", tag).expect(304);
    await client
      .get("/docs/public")
      .set("If-Modified-Since", modified)
      .expect(304);
    await client
      .get("/docs/public")
      .set("If-Modified-Since", "invalid")
      .expect(200);
    await client
      .get("/docs/public")
      .set("If-None-Match", tag)
      .set("If-Modified-Since", "Thu, 01 Jan 1970 00:00:00 GMT")
      .expect(200);
    const partial = await client
      .get("/docs/public")
      .set("Range", "bytes=0-9")
      .expect(206);
    expect(partial.headers["etag"]).toBe(tag);
    expect(partial.text).toHaveLength(10);
  });
  it("serves development configuration assets only on development", async () => {
    await createClient()
      .get("/configure")
      .expect(200)
      .expect("Content-Type", /html/);
    vi.stubEnv("MODE", "prod");
    await createClient().get("/configure").expect(404);
  });
});
