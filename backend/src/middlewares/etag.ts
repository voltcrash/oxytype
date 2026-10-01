import { ApiMiddleware } from "../api/http";
import { createETagGenerator } from "../utils/etag";

const generateETag = createETagGenerator({ weak: true });

export const etagMiddleware: ApiMiddleware = async (c, next) => {
  await next();
  const response = c.res;
  if (
    response.status === 204 ||
    response.status === 304 ||
    response.body === null
  )
    return;
  const etag =
    response.headers.get("etag") ??
    generateETag(Buffer.from(await response.clone().arrayBuffer()), undefined);
  c.header("ETag", etag);
  const match = c.req.header("if-none-match");
  const cacheControl = c.req.header("cache-control") ?? "";
  if (
    (c.req.method === "GET" || c.req.method === "HEAD") &&
    response.status >= 200 &&
    response.status < 300 &&
    match !== undefined &&
    !/\bno-cache\b/i.test(cacheControl) &&
    (match.trim() === "*" ||
      match
        .split(",")
        .some(
          (tag) => tag.trim().replace(/^W\//, "") === etag.replace(/^W\//, ""),
        ))
  ) {
    const headers = new Headers(c.res.headers);
    headers.delete("content-type");
    headers.delete("content-length");
    headers.delete("transfer-encoding");
    c.res = new Response(null, { status: 304, headers });
  }
};
