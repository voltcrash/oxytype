import type { WorkerEnv } from "../runtime/env";
import type { Context as HonoContext, MiddlewareHandler } from "hono";
import type { AppRoute } from "@ts-rest/core";
import type { Context } from "../middlewares/context";

/** Transport data shared with controllers; independent of Node request objects. */
export type HttpRequest = {
  method: string;
  path: string;
  url: string;
  originalUrl: string;
  ip: string;
  headers: Record<string, string | undefined>;
  body: unknown;
  rawBody: string;
  query: Record<string, unknown>;
  params: Record<string, string>;
  tsRestRoute?: AppRoute;
  ctx: Context;
};

export type ApiEnv = {
  Bindings: Partial<WorkerEnv> & {
    incoming?: { socket: { remoteAddress?: string } };
    outgoing?: { statusMessage: string };
  };
  Variables: {
    request: HttpRequest;
    body: unknown;
    rawBody: string;
  };
};
export type ApiContext = HonoContext<ApiEnv>;
export type ApiMiddleware = MiddlewareHandler<ApiEnv>;
