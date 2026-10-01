import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { join } from "path";
import { ApiEnv } from "../http";
import MonkeyError from "../../utils/error";

const router = new Hono<ApiEnv>({ strict: false });
const root = join(__dirname, "../../../dist/static/api");
const CSP =
  "default-src 'self';base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' cdn.redocly.com data:;object-src 'none';script-src 'self' cdn.redocly.com 'unsafe-inline'; worker-src blob: data;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests";

for (const [route, file] of [
  ["/internal", "internal.html"],
  ["/internal.json", "openapi.json"],
  ["/public", "public.html"],
  ["/", "public.html"],
  ["/public.json", "public.json"],
]) {
  router.get(
    route as string,
    async (c, next) => {
      if (file?.endsWith(".html")) c.header("Content-Security-Policy", CSP);
      await next();
    },
    serveStatic({
      path: join(root, file as string),
      onNotFound: () => {
        throw new MonkeyError(404, "API documentation file not found");
      },
    }),
  );
}

export default router;
