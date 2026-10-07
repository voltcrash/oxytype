import { EndpointMetadata } from "@oxytype/contracts/util/api";
import { ApiMiddleware, HttpRequest } from "../api/http";
import MonkeyError from "../utils/error";
import { isDevEnvironment } from "../utils/misc";
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
