import { getSessionCookie } from "better-auth/cookies";
import { addAuthRoutes } from "./auth/routes";
import { getFrontendUrl } from "./utils/misc";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { addApiRoutes } from "./api/routes";
import contextMiddleware from "./middlewares/context";
import errorHandlingMiddleware from "./middlewares/error";
import {
  badAuthRateLimiterHandler,
  rootRateLimiter,
} from "./middlewares/rate-limit";
import { compatibilityCheckMiddleware } from "./middlewares/compatibilityCheck";
import { COMPATIBILITY_CHECK_HEADER, contract } from "@oxytype/contracts";
import { requestBodyLimit, parseRequestBody } from "./middlewares/body";
import { etagMiddleware } from "./middlewares/etag";
import { ApiEnv } from "./api/http";
import { createPathNormalizer } from "./api/path";

export function buildApp(options: { docsRoot?: string } = {}): Hono<ApiEnv> {
  const docsPrefix =
    process.env["API_PATH_OVERRIDE"] === undefined
      ? "/docs"
      : `/${process.env["API_PATH_OVERRIDE"]}/docs`;
  const getPath = createPathNormalizer(contract, [
    "/",
    "/configure",
    "/stats",
    "/stats/ui",
    "/stats/swagger-stats",
    "/stats/metrics",
    "/stats/swagger.json",
    docsPrefix,
    ...["internal", "internal.json", "public", "public.json"].map(
      (path) => `${docsPrefix}/${path}`,
    ),
  ]);
  const app = new Hono<ApiEnv>({ getPath });
  app.onError(errorHandlingMiddleware);
  app.use(etagMiddleware);
  app.use(requestBodyLimit);
  app.use(
    cors({
      origin: new URL(getFrontendUrl()).origin,
      credentials: true,
      exposeHeaders: [COMPATIBILITY_CHECK_HEADER],
      allowMethods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    }),
  );
  const security = secureHeaders({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
    xFrameOptions: "SAMEORIGIN",
    strictTransportSecurity: "max-age=15552000; includeSubDomains",
    xDnsPrefetchControl: "off",
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      upgradeInsecureRequests: [],
    },
  });
  app.use(async (c, next) => {
    let routeCsp: string | null = null;
    await security(c, async () => {
      await next();
      routeCsp = c.res.headers.get("Content-Security-Policy");
    });
    if (routeCsp !== null) c.header("Content-Security-Policy", routeCsp);
  });
  addAuthRoutes(app);
  app.use(parseRequestBody);
  app.use(async (c, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
      typeof getSessionCookie(c.req.raw, { cookiePrefix: "oxytype" }) ===
        "string" &&
      c.req.header("authorization") === undefined &&
      c.req.header("origin") !== new URL(getFrontendUrl()).origin
    ) {
      return c.json({ message: "Untrusted origin" }, 403);
    }
    return next();
  });
  app.use(compatibilityCheckMiddleware);
  app.use(contextMiddleware);
  app.use(badAuthRateLimiterHandler);
  app.use(rootRateLimiter);
  addApiRoutes(app, options.docsRoot);
  return app;
}

export default buildApp();
