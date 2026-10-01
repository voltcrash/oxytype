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
import { COMPATIBILITY_CHECK_HEADER } from "@oxytype/contracts";
import { requestBodyLimit, parseRequestBody } from "./middlewares/body";
import { etagMiddleware } from "./middlewares/etag";
import { ApiEnv } from "./api/http";

export function buildApp(): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>({ strict: false });
  app.onError(errorHandlingMiddleware);
  app.use(etagMiddleware);
  app.use(requestBodyLimit);
  app.use(parseRequestBody);
  app.use(
    cors({
      exposeHeaders: [COMPATIBILITY_CHECK_HEADER],
      allowMethods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    }),
  );
  app.use(
    secureHeaders({
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
    }),
  );
  app.use(compatibilityCheckMiddleware);
  app.use(contextMiddleware);
  app.use(badAuthRateLimiterHandler);
  app.use(rootRateLimiter);
  addApiRoutes(app);
  return app;
}

export default buildApp();
