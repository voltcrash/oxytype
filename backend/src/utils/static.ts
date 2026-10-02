import type { ApiContext, ApiMiddleware } from "../api/http";
import { runtime } from "../runtime/env";
type Options = {
  path?: string;
  root?: string;
  rewriteRequestPath?: (path: string) => string;
  onNotFound?: () => void;
  onFound?: (path: string, c: ApiContext) => void | Promise<void>;
};
/** Immutable deployment assets; no filesystem reads in request handlers. */
export function serveStatic(options: Options): ApiMiddleware {
  return async (c, next) => {
    const assets = runtime().env.ASSETS;
    const path =
      options.path ??
      `${options.root ?? ""}${options.rewriteRequestPath?.(c.req.path) ?? c.req.path}`;
    if (assets === undefined) {
      options.onNotFound?.();
      await next();
      return;
    }
    const url = new URL(c.req.url);
    url.pathname = path;
    const response = await assets.fetch(url.toString(), {
      method: c.req.method,
      headers: Object.fromEntries(c.req.raw.headers),
    });
    if (response.status === 404) {
      options.onNotFound?.();
      await next();
      return;
    }
    await options.onFound?.(path, c);
    return response as unknown as Response;
  };
}
