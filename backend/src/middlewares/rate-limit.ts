import MonkeyError from "../utils/error";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { Address6 } from "ip-address";
import { isIP } from "net";
import { isDevEnvironment } from "../utils/misc";
import { limits, RateLimiterId, RateLimitOptions, Window } from "@oxytype/contracts/rate-limit/index";
import statuses from "../constants/monkey-status-codes";
import { getMetadata } from "./utility";
import { ApiContext, ApiMiddleware, HttpRequest } from "../api/http";

export const REQUEST_MULTIPLIER = isDevEnvironment() ? 100 : 1;

export function getClientIp(c: ApiContext): string {
  // One trusted proxy: the rightmost forwarded address is the immediate client.
  return c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    c.env.incoming?.socket.remoteAddress || "255.255.255.255";
}

export function getIpKey(ip: string): string {
  return isIP(ip) === 6
    ? `${new Address6(`${ip}/56`).startAddress().correctForm()}/56`
    : ip;
}

function getKey(req: HttpRequest): string {
  return getIpKey(req.ip);
}

export function customHandler(req: HttpRequest): never {
  if (req.ctx.decodedToken.type === "ApeKey") {
    throw new MonkeyError(statuses.APE_KEY_RATE_LIMIT_EXCEEDED.code, statuses.APE_KEY_RATE_LIMIT_EXCEEDED.message);
  }
  throw new MonkeyError(429, "Request limit reached, please try again later.");
}

function convertWindowToMs(window: Window): number {
  if (typeof window === "number") return window;
  return { second: 1000, minute: 60000, hour: 3600000, day: 86400000 }[window];
}

export function createRateLimiter(
  options: RateLimitOptions,
  useUid = true,
  onLimit: (req: HttpRequest) => never = customHandler,
): ApiMiddleware {
  const max = options.max * REQUEST_MULTIPLIER;
  const limiter = new RateLimiterMemory({ points: max, duration: convertWindowToMs(options.window) / 1000 });
  return async (c, next) => {
    const req = c.get("request");
    const key = (useUid && req.ctx.decodedToken.uid) || getKey(req);
    let result: RateLimiterRes;
    try {
      result = await limiter.consume(key);
    } catch (error) {
      if (!(error instanceof RateLimiterRes)) throw error;
      setHeaders(c, max, error);
      c.header("Retry-After", String(Math.ceil(error.msBeforeNext / 1000)));
      onLimit(req);
    }
    setHeaders(c, max, result);
    await next();
  };
}

function setHeaders(c: ApiContext, max: number, result: RateLimiterRes): void {
  c.header("X-RateLimit-Limit", String(max));
  c.header("X-RateLimit-Remaining", String(Math.max(0, result.remainingPoints)));
  c.header("X-RateLimit-Reset", String(Math.ceil((Date.now() + result.msBeforeNext) / 1000)));
}

export const requestLimiters = Object.fromEntries(
  Object.entries(limits).map(([id, options]) => [id, createRateLimiter(options)]),
) as Record<RateLimiterId, ApiMiddleware>;

export function rateLimitRequest(): ApiMiddleware {
  return async (c, next) => {
    const req = c.get("request");
    const metadataRateLimit = getMetadata(req).rateLimit;
    if (metadataRateLimit === undefined) {
      await next();
      return;
    }
    const hasApeKeyLimiterId = typeof metadataRateLimit === "object";
    const rateLimiterId = req.ctx.decodedToken.type === "ApeKey"
      ? hasApeKeyLimiterId ? metadataRateLimit.apeKey : "defaultApeRateLimit"
      : hasApeKeyLimiterId ? metadataRateLimit.normal : metadataRateLimit;
    const limiter = requestLimiters[rateLimiterId];
    if (limiter === undefined) {
      throw new MonkeyError(500, `Unknown rateLimiterId '${rateLimiterId}', how did you manage to do this?`);
    }
    await limiter(c, next);
  };
}

export const rootRateLimiter = createRateLimiter({ window: "hour", max: 1000 }, false, () => {
  throw new MonkeyError(429, "Maximum API request (root) limit reached. Please try again later.");
});

const badAuthRateLimiter = new RateLimiterMemory({ points: 30 * REQUEST_MULTIPLIER, duration: 3600 });

export const badAuthRateLimiterHandler: ApiMiddleware = async (c, next) => {
  const req = c.get("request");
  if (req.ctx.configuration.rateLimiting.badAuthentication.enabled) {
    const result = await badAuthRateLimiter.get(getKey(req));
    if (result !== null && result.remainingPoints <= 0) {
      throw new MonkeyError(429, "Too many bad authentication attempts, please try again later.");
    }
  }
  await next();
};

export async function incrementBadAuth(req: HttpRequest | undefined, status: number): Promise<void> {
  const options = req?.ctx.configuration.rateLimiting.badAuthentication;
  if (!options?.enabled || !options.flaggedStatusCodes.includes(status)) return;
  try {
    await badAuthRateLimiter.penalty(getKey(req as HttpRequest), options.penalty);
  } catch {}
}
