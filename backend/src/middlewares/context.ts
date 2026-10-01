import { getCachedConfiguration } from "../init/configuration";
import { DecodedToken } from "./auth";
import { Configuration } from "@oxytype/schemas/configuration";
import { ApiMiddleware } from "../api/http";
import { getClientIp } from "./rate-limit";

export type Context = {
  configuration: Configuration;
  decodedToken: DecodedToken;
};

const contextMiddleware: ApiMiddleware = async (c, next) => {
  const url = new URL(c.req.url);
  c.set("request", {
    method: c.req.method,
    path: c.req.path,
    url: url.pathname + url.search,
    originalUrl: url.pathname + url.search,
    ip: getClientIp(c),
    headers: c.req.header(),
    body: c.get("body") ?? {},
    rawBody: c.get("rawBody") ?? "",
    query: Object.fromEntries(
      Object.entries(c.req.queries()).map(([key, values]) => [
        key,
        values.length === 1 ? values[0] : values,
      ]),
    ),
    params: {},
    ctx: {
      configuration: await getCachedConfiguration(true),
      decodedToken: { type: "None", uid: "", email: "" },
    },
  });
  await next();
};
export default contextMiddleware;
