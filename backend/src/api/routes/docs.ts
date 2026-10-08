import { Hono } from "hono";
import { serveStatic } from "../../utils/static";
import { ApiEnv, ApiMiddleware } from "../http";
import MonkeyError from "../../utils/error";

const CSP =
  "default-src 'self';base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' cdn.redocly.com data:;object-src 'none';script-src 'self' cdn.redocly.com 'unsafe-inline'; worker-src blob: data;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests";

export function createDocsRoutes(root = "/docs"): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>({ strict: false });
  for (const [route, file] of [
    ["/internal", "internal.html"],
    ["/internal.json", "openapi.json"],
    ["/public", "public.html"],
    ["/", "public.html"],
    ["/public.json", "public.json"],
  ] as const) {
    const setCsp: ApiMiddleware = async (c, next) => {
      if (file.endsWith(".html")) c.header("Content-Security-Policy", CSP);
      await next();
    };
    router.get(
      route,
      setCsp,
      serveStatic({
        path: `${root}/${file}`,
        onNotFound: () => {
          throw new MonkeyError(404, "API documentation file not found");
        },
      }),
    );
  }

  return router;
}
