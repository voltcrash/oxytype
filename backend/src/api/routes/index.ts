import { contract } from "@oxytype/contracts/index";
import psas from "./psas";
import publicStats from "./public";
import users from "./users";
import { join } from "path";
import quotes from "./quotes";
import results from "./results";
import presets from "./presets";
import apeKeys from "./ape-keys";
import admin from "./admin";
import docs from "./docs";
import webhooks from "./webhooks";
import dev from "./dev";
import configs from "./configs";
import configuration from "./configuration";
import { version } from "../../version";
import leaderboards from "./leaderboards";
import connections from "./connections";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { ApiEnv } from "../http";
import { initServer, createHonoEndpoints } from "../hono-adapter";
import { addStatsRoutes } from "./stats";
import { MonkeyResponse } from "../../utils/monkey-response";
import { isDevEnvironment } from "../../utils/misc";
import { getLiveConfiguration } from "../../init/configuration";
import Logger from "../../utils/logger";
import { authenticateTsRestRequest } from "../../middlewares/auth";
import { rateLimitRequest } from "../../middlewares/rate-limit";
import { verifyPermissions } from "../../middlewares/permission";
import { verifyRequiredConfiguration } from "../../middlewares/configuration";

const pathOverride = process.env["API_PATH_OVERRIDE"];
const BASE_ROUTE = pathOverride !== undefined ? `/${pathOverride}` : "";
const APP_START_TIME = Date.now();

const s = initServer();
const router = s.router(contract, {
  admin,
  apeKeys,
  configs,
  presets,
  psas,
  public: publicStats,
  leaderboards,
  results,
  configuration,
  dev,
  users,
  quotes,
  webhooks,
  connections,
});

export function addApiRoutes(app: Hono<ApiEnv>): void {
  if (isDevEnvironment()) {
    app.use(async (c, next) => {
      await next();
      c.header("Content-Security-Policy", "");
    });
    app.get(
      "/configure",
      serveStatic({ path: join(__dirname, "../../../private/index.html") }),
    );
    app.get(
      "/configure/*",
      serveStatic({
        root: join(__dirname, "../../../private"),
        rewriteRequestPath: (path) => path.replace(/^\/configure/, ""),
      }),
    );
    app.use(async (c, next) => {
      const slowdown = (await getLiveConfiguration()).dev.responseSlowdownMs;
      if (slowdown > 0) {
        Logger.info(
          `Simulating ${slowdown}ms delay for ${c.req.method} ${c.req.path}`,
        );
        await new Promise((resolve) => setTimeout(resolve, slowdown));
      }
      await next();
    });
  }

  addStatsRoutes(app);
  app.use(async (c, next) => {
    if (
      !c.req.path.startsWith("/configuration") &&
      (process.env["MAINTENANCE"] === "true" ||
        c.get("request").ctx.configuration.maintenance)
    ) {
      return c.json({ message: "Server is down for maintenance" }, 503);
    }
    await next();
    return;
  });
  app.get("/", (c) =>
    c.json(
      new MonkeyResponse("ok", {
        uptime: Date.now() - APP_START_TIME,
        version,
      }),
    ),
  );
  app.route(`${BASE_ROUTE}/docs`, docs);
  createHonoEndpoints(contract, router, app, [
    authenticateTsRestRequest(),
    rateLimitRequest(),
    verifyRequiredConfiguration(),
    verifyPermissions(),
  ]);
  app.notFound((c) =>
    c.json(
      new MonkeyResponse(
        `Unknown request URL (${c.req.method}: ${c.req.path})`,
        null,
      ),
      404,
    ),
  );
}
