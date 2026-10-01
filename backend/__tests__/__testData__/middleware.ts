import { Context } from "hono";
import { ApiEnv, ApiMiddleware, HttpRequest } from "../../src/api/http";

/** Invoke a native Hono middleware with a test-owned request context. */
export async function invokeMiddleware(
  handler: ApiMiddleware,
  request: HttpRequest,
  next: (error?: unknown) => unknown,
): Promise<void> {
  const c = new Context<ApiEnv>(new Request("http://localhost/"), {
    env: {},
    path: "/",
  });
  c.set("request", request);
  try {
    await handler(c, async () => {
      next();
    });
  } catch (error) {
    next(error);
  }
}
