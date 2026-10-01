import { EndpointMetadata } from "@oxytype/contracts/util/api";
import { ApiMiddleware, HttpRequest } from "../api/http";
import MonkeyError from "../utils/error";
import { isDevEnvironment } from "../utils/misc";
import { recordClientVersion as prometheusRecordClientVersion } from "../utils/prometheus";

export function recordClientVersion(): ApiMiddleware {
  return async (c, next) => {
    const version =
      c.req.header("x-client-version") ?? c.req.header("client-version");
    prometheusRecordClientVersion(version ?? "unknown");
    await next();
  };
}

export function onlyAvailableOnDev(): ApiMiddleware {
  return async (_c, next) => {
    if (!isDevEnvironment()) {
      throw new MonkeyError(
        503,
        "Development endpoints are only available in DEV mode.",
      );
    }
    await next();
  };
}

export function getMetadata(req: HttpRequest): EndpointMetadata {
  return req.tsRestRoute?.metadata ?? {};
}
