import { envValue } from "../runtime/env";
import type { Hono } from "hono";
import type { ApiEnv } from "../api/http";
import * as UserDAL from "../dal/user";
import * as AuthUtils from "../utils/auth";
import { getAuth } from "../init/auth";
import { getFrontendUrl } from "../utils/misc";
import { getClientIp } from "../middlewares/rate-limit";

/** Auth owns its request body, cookies, CSRF checks, and rate limits. */
export function addAuthRoutes(app: Hono<ApiEnv>): void {
  app.all("/auth/*", async (c) => {
    const auth = getAuth();
    // Existing infrastructure strips /api before requests reach Hono.
    const publicUrl = new URL(
      envValue("BETTER_AUTH_URL") ?? "http://localhost:5005/auth",
    );
    publicUrl.pathname = `${publicUrl.pathname.replace(/\/$/, "")}${c.req.path.slice("/auth".length)}`;
    publicUrl.search = new URL(c.req.url).search;
    const request = new Request(publicUrl, c.req.raw);
    // Resolve through the API's proxy policy; never trust this caller-supplied header.
    request.headers.set("x-oxytype-auth-ip", getClientIp(c));
    // Dashboard server requests use the plugin's signed JWT, rather than cookies.
    const dashboardRequest =
      c.req.path.startsWith("/auth/dash/") &&
      request.headers.get("authorization")?.startsWith("Bearer ") === true &&
      !request.headers.has("cookie");
    if (
      c.req.method !== "GET" &&
      c.req.method !== "HEAD" &&
      !dashboardRequest
    ) {
      const origin = c.req.header("origin");
      if (origin !== new URL(getFrontendUrl()).origin) {
        return c.json({ message: "Untrusted origin" }, 403);
      }
    }
    const headers = request.headers;
    if (c.req.path === "/auth/cancel-sign-up" && c.req.method === "POST") {
      const session = await AuthUtils.verifySession(headers);
      const existing = await UserDAL.exists(session.uid);
      if (existing) {
        return c.json(
          { message: "Account registration is already complete" },
          409,
        );
      }
      await AuthUtils.deleteUser(session.uid);
      return c.json({ status: true });
    }
    return auth.handler(request);
  });
}
