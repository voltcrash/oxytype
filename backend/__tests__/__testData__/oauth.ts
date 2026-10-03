import { expect, vi } from "vite-plus/test";
import type { createAuth } from "../../src/init/auth";
import type { buildApp } from "../../src/app";

export function cookies(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}

/** Exercise real OAuth state, callbacks, and sessions; mock only provider APIs. */
export async function signInWithOAuth(
  auth: ReturnType<typeof createAuth>,
  app: ReturnType<typeof buildApp>,
  options: {
    provider?: "google" | "github";
    email?: string;
    rememberMe?: boolean;
    frontendUrl?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<{ cookie: string; response: Response }> {
  const providerId = options.provider ?? "google";
  const email = options.email ?? "newuser@example.com";
  const frontendUrl = options.frontendUrl ?? "http://localhost:3000";
  const callbackURL = `${frontendUrl}/oauth-callback?requestId=nonce`;
  const context = await auth.$context;
  const provider = context.socialProviders.find((it) => it.id === providerId);
  if (!provider) throw new Error(`Missing ${providerId} test provider`);
  vi.spyOn(provider, "validateAuthorizationCode").mockResolvedValue({
    accessToken: "test-access-token",
  });
  vi.spyOn(provider, "getUserInfo").mockResolvedValue({
    user: { name: "NewUser", email, emailVerified: true },
    data: { sub: `${providerId}-${email}`, id: `${providerId}-${email}` },
  });
  const start = await app.request("http://localhost:5005/auth/sign-in/social", {
    method: "POST",
    headers: {
      origin: frontendUrl,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      provider: providerId,
      callbackURL,
      disableRedirect: true,
      additionalData: { rememberMe: options.rememberMe ?? true },
    }),
  });
  expect(start.status).toBe(200);
  const data = (await start.json()) as { url: string };
  const state = new URL(data.url).searchParams.get("state");
  expect(state).toBeTruthy();
  const response = await app.request(
    `http://localhost:5005/auth/callback/${providerId}?code=test-code&state=${state}`,
    { headers: { cookie: cookies(start), ...options.headers } },
  );
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe(callbackURL);
  return { cookie: cookies(response), response };
}
