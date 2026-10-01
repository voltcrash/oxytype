import { Hono } from "hono";
import { routePath } from "hono/route";
import { basicAuth } from "hono/basic-auth";
import { Counter, Histogram, register } from "prom-client";
import { performance } from "perf_hooks";
import { serveStatic } from "../../utils/static";
import { join } from "path";
import { ApiEnv } from "../http";
import { isDevEnvironment } from "../../utils/misc";

const requests = new Counter({
  name: "api_http_requests_total",
  help: "HTTP requests by contract path, method, and status",
  labelNames: ["path", "method", "status"],
});
const duration = new Histogram({
  name: "api_http_request_duration_seconds",
  help: "HTTP response latency in seconds",
  labelNames: ["path", "method", "status"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
});
const stats = {
  startedAt: Date.now(),
  requests: 0,
  errors: 0,
  totalDurationMs: 0,
};

/** Replaces the Express-only Swagger Stats middleware. */
export function addStatsRoutes(app: Hono<ApiEnv>): void {
  app.use(async (c, next) => {
    const start = performance.now();
    await next();
    const elapsed = performance.now() - start;
    const labels = {
      path:
        c.get("request")?.tsRestRoute?.path ??
        (c.res.status === 404 ? "unmatched" : routePath(c)),
      method: c.req.method,
      status: String(c.res.status),
    };
    requests.inc(labels);
    duration.observe(labels, elapsed / 1000);
    stats.requests++;
    stats.totalDurationMs += elapsed;
    if (c.res.status >= 400) stats.errors++;
  });
  const authenticate = basicAuth({
    realm: "Oxytype API stats",
    verifyUser: (username, password) =>
      (process.env["STATS_USERNAME"] ?? "") !== "" &&
      (process.env["STATS_PASSWORD"] ?? "") !== "" &&
      username === process.env["STATS_USERNAME"] &&
      password === process.env["STATS_PASSWORD"],
  });
  app.use(async (c, next) => {
    if (
      !isDevEnvironment() &&
      (c.req.path === "/stats" || c.req.path.startsWith("/stats/"))
    ) {
      return authenticate(c, next);
    }
    await next();
  });
  const summary = (): typeof stats & {
    uptime: number;
    averageDurationMs: number;
  } => ({
    ...stats,
    uptime: Date.now() - stats.startedAt,
    averageDurationMs:
      stats.requests === 0 ? 0 : stats.totalDurationMs / stats.requests,
  });
  app.get("/stats", (c) => c.redirect("/stats/ui"));
  app.get("/stats/", (c) => c.redirect("/stats/ui"));
  app.get("/stats/ui", (c) =>
    c.html(
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>Oxytype API stats</title><h1>Oxytype API stats</h1><p>Refresh to update.</p><pre>${JSON.stringify(summary(), null, 2)}</pre><a href="/stats/swagger-stats">JSON stats</a> <a href="/stats/metrics">Prometheus metrics</a></html>`,
    ),
  );
  app.get("/stats/swagger-stats", (c) => c.json(summary()));
  app.get("/stats/metrics", async (c) => {
    c.header("Content-Type", register.contentType);
    return c.body(await register.metrics());
  });
  app.get(
    "/stats/swagger.json",
    serveStatic({
      path: join(__dirname, "../../../dist/static/api/openapi.json"),
    }),
  );
}
