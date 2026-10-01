import { ApiMiddleware } from "../api/http";
import { createETagGenerator } from "../utils/etag";

const generateETag = createETagGenerator({ weak: true });

export const etagMiddleware: ApiMiddleware = async (c, next) => {
  await next();
  if (c.req.path.startsWith("/auth/")) {
    c.header("Cache-Control", "no-store");
    return;
  }
  if (c.res.headers.get("content-type") === "application/json") {
    c.header("Content-Type", "application/json; charset=utf-8");
  }
  const response = c.res;
  if (
    response.status === 204 ||
    response.status === 304 ||
    (response.body === null && !response.headers.has("etag"))
  ) {
    return;
  }
  const etag =
    response.headers.get("etag") ??
    generateETag(Buffer.from(await response.clone().arrayBuffer()), undefined);
  c.header("ETag", etag);
  const match = c.req.header("if-none-match");
  const cacheControl = c.req.header("cache-control") ?? "";
  const modifiedSince = c.req.header("if-modified-since");
  const lastModified = response.headers.get("last-modified");
  const dateMatches =
    modifiedSince !== undefined &&
    lastModified !== null &&
    Date.parse(lastModified) <= Date.parse(modifiedSince);
  const etagMatches =
    match !== undefined &&
    (match.trim() === "*" ||
      match
        .split(",")
        .some(
          (tag) => tag.trim().replace(/^W\//, "") === etag.replace(/^W\//, ""),
        ));
  const fresh =
    (match !== undefined ? etagMatches : dateMatches) &&
    (modifiedSince === undefined || dateMatches);
  if (
    (c.req.method === "GET" || c.req.method === "HEAD") &&
    response.status >= 200 &&
    response.status < 300 &&
    !/\bno-cache\b/i.test(cacheControl) &&
    fresh
  ) {
    const headers = new Headers(c.res.headers);
    headers.delete("content-type");
    headers.delete("content-length");
    headers.delete("transfer-encoding");
    headers.delete("content-range");
    c.res = new Response(null, { status: 304, headers });
  }
};
