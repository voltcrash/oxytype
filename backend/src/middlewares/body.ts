import { bodyLimit } from "hono/body-limit";
import { brotliDecompressSync, gunzipSync, inflateSync } from "zlib";
import qs from "qs";
import { ApiMiddleware } from "../api/http";
import MonkeyError from "../utils/error";

export const MAX_BODY_SIZE = 100 * 1024;
export const requestBodyLimit = bodyLimit({
  maxSize: MAX_BODY_SIZE,
  onError: () => { throw new MonkeyError(413, "Request body too large"); },
});

export const parseRequestBody: ApiMiddleware = async (c, next) => {
  c.set("body", {});
  c.set("rawBody", "");
  const type = c.req.header("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (type === "application/json" || type === "application/x-www-form-urlencoded") {
    const charset = c.req.header("content-type")?.match(/charset=([^;]+)/i)?.[1]?.replace(/"/g, "").toLowerCase();
    if (charset !== undefined && charset !== "utf-8" && charset !== "utf8") {
      throw new MonkeyError(415, "Unsupported request charset");
    }
    let bytes = Buffer.from(await c.req.arrayBuffer());
    const encoding = c.req.header("content-encoding")?.toLowerCase() ?? "identity";
    const decompress = { gzip: gunzipSync, deflate: inflateSync, br: brotliDecompressSync }[encoding];
    if (encoding !== "identity") {
      if (decompress === undefined) throw new MonkeyError(415, "Unsupported content encoding");
      try {
        bytes = decompress(bytes, { maxOutputLength: MAX_BODY_SIZE });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ERR_BUFFER_TOO_LARGE") {
          throw new MonkeyError(413, "Request body too large");
        }
        throw new SyntaxError("Invalid compressed request body");
      }
    }
    const rawBody = bytes.toString("utf8");
    c.set("rawBody", rawBody);
    if (rawBody.length > 0) {
      if (type === "application/json") {
        // Match strict JSON parsing: primitives are not accepted as request bodies.
        if (!/^[\s\uFEFF]*[\[{]/.test(rawBody)) throw new SyntaxError("Invalid JSON request body");
        c.set("body", JSON.parse(rawBody.replace(/^\uFEFF/, "")) as unknown);
      } else {
        if (rawBody.split("&").length > 1000) throw new MonkeyError(413, "Too many request parameters");
        c.set("body", qs.parse(rawBody, { depth: 32, strictDepth: true, parameterLimit: 1000 }));
      }
    }
  }
  await next();
};
