import {
  COMPATIBILITY_CHECK,
  COMPATIBILITY_CHECK_HEADER,
} from "@oxytype/contracts";
import { ApiMiddleware } from "../api/http";

export const compatibilityCheckMiddleware: ApiMiddleware = async (c, next) => {
  c.header(COMPATIBILITY_CHECK_HEADER, COMPATIBILITY_CHECK);
  await next();
};
