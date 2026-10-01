import {
  serveStatic as serveNodeStatic,
  ServeStaticOptions,
} from "@hono/node-server/serve-static";
import { stat } from "fs/promises";
import { ApiEnv, ApiMiddleware } from "../api/http";

/** Use file metadata for stable GET/HEAD validators without buffering file streams. */
export function serveStatic(
  options: ServeStaticOptions<ApiEnv>,
): ApiMiddleware {
  return serveNodeStatic({
    ...options,
    onFound: async (path, c) => {
      const file = await stat(path);
      c.header(
        "ETag",
        `W/"${file.size.toString(16)}-${file.mtime.getTime().toString(16)}"`,
      );
      c.header("Cache-Control", "public, max-age=0");
      c.header("Accept-Ranges", "bytes");
      await options.onFound?.(path, c);
    },
  });
}
