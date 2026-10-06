import { envValue } from "../../runtime/env";
import { contract } from "@oxytype/contracts/index";
import psas from "./psas";
import publicStats from "./public";
import users from "./users";
import quotes from "./quotes";
import results from "./results";
import presets from "./presets";
import apeKeys from "./ape-keys";
import admin from "./admin";
import { createDocsRoutes } from "./docs";
import dev from "./dev";
import configs from "./configs";
import configuration from "./configuration";
import { getVersion } from "../../version";
import leaderboards from "./leaderboards";
import { Hono } from "hono";
import { serveStatic } from "../../utils/static";
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

let appStartTime: number | undefined;

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
});

export function addApiRoutes(app: Hono<ApiEnv>, docsRoot?: string): void {
  const pathOverride = envValue("API_PATH_OVERRIDE");
  const BASE_ROUTE = pathOverride === undefined ? "" : `/${pathOverride}`;
  if (isDevEnvironment()) {
    app.use(async (c, next) => {
      c.header("Content-Security-Policy", "");
      await next();
    });
    app.get("/configure", serveStatic({ path: "/configure/index.html" }));
    app.get(
      "/configure/*",
      serveStatic({
        root: "/configure",
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
      (envValue("MAINTENANCE") === "true" ||
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
        uptime: Date.now() - (appStartTime ??= Date.now()),
        version: getVersion(),
      }),
    ),
  );
  app.route(`${BASE_ROUTE}/docs`, createDocsRoutes(docsRoot));
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
