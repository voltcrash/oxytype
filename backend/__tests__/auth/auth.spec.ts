import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { memoryAdapter } from "better-auth/adapters/memory";
import { createAuth } from "../../src/init/auth";
import * as AuthInit from "../../src/init/auth";
import * as AuthUtils from "../../src/utils/auth";
import { buildApp } from "../../src/app";
import emailQueue from "../../src/queues/email-queue";

vi.mock("../../src/queues/email-queue", () => ({
  default: { sendVerificationEmail: vi.fn(), sendForgotPasswordEmail: vi.fn() },
}));
const email = "newuser@example.com";
const password = "StrongPassword1!";
let auth: ReturnType<typeof createAuth>;
let app: ReturnType<typeof buildApp>;
let store: Record<string, unknown[]>;

beforeEach(() => {
  store = {
    authUsers: [],
    authAccounts: [],
    authSessions: [],
    authVerifications: [],
    authRateLimits: [],
  };
  auth = createAuth(memoryAdapter(store));
  vi.spyOn(AuthInit, "getAuth").mockReturnValue(auth);
  app = buildApp();
  vi.mocked(emailQueue.sendForgotPasswordEmail).mockReset();
  vi.mocked(emailQueue.sendVerificationEmail).mockReset();
});

async function request(
  path: string,
  body?: Record<string, unknown>,
  cookie?: string,
): Promise<Response> {
  return app.request(`http://localhost:5005/auth${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      origin: "http://localhost:3000",
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie !== undefined ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
function cookies(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
async function signUp(): Promise<string> {
  const response = await request("/sign-up/email", {
    name: "NewUser",
    email,
    password,
  });
  expect(response.status).toBe(200);
  return cookies(response);
}

describe("Better Auth HTTP flow", () => {
  it("creates credentials and HttpOnly sessions without Firebase", async () => {
    const cookie = await signUp();
    const session = await request("/get-session", undefined, cookie);
    expect(session.status).toBe(200);
    expect(await session.json()).toMatchObject({
      user: { email, name: "NewUser" },
    });
    expect(session.headers.get("cache-control")).toBe("no-store");
    expect(store["authAccounts"]).toHaveLength(1);
    const credential = store["authAccounts"]?.[0] as { password: string };
    expect(credential.password).not.toBe(password);
    const result = await AuthUtils.verifySession(new Headers({ cookie }));
    expect(result.email).toBe(email);
    expect(result.createdAt).toBeInstanceOf(Date);
  });
  it("rejects bad passwords and honors session-only login", async () => {
    await signUp();
    const wrong = await request("/sign-in/email", {
      email,
      password: "WrongPassword1!",
    });
    expect(wrong.status).toBe(401);
    const signedIn = await request("/sign-in/email", {
      email,
      password,
      rememberMe: false,
    });
    expect(signedIn.status).toBe(200);
    const sessionCookie = signedIn.headers
      .getSetCookie()
      .find((value) => value.includes("session_token="));
    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).not.toContain("Max-Age");
    expect(sessionCookie).not.toContain("Expires");
  });
  it("invalidates revoked sessions immediately", async () => {
    const cookie = await signUp();
    const session = await AuthUtils.verifySession(new Headers({ cookie }));
    await AuthUtils.revokeTokensByUid(session.uid);
    await expect(
      AuthUtils.verifySession(new Headers({ cookie })),
    ).rejects.toThrow("Session expired or revoked");
  });
  it("signs out and rejects a removed cookie session", async () => {
    const cookie = await signUp();
    expect((await request("/sign-out", {}, cookie)).status).toBe(200);
    await expect(
      AuthUtils.verifySession(new Headers({ cookie })),
    ).rejects.toThrow("Session expired or revoked");
  });
  it("rejects foreign origins before registration and preserves the raw JSON body", async () => {
    const response = await app.request(
      "http://localhost:5005/auth/sign-up/email",
      {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "NewUser", email, password }),
      },
    );
    expect(response.status).toBe(403);
    expect(store["authUsers"]).toHaveLength(0);
    await signUp();
  });
  it("queues verification links and verifies email tokens", async () => {
    await signUp();
    await AuthUtils.sendVerificationEmail(email);
    const call = vi.mocked(emailQueue.sendVerificationEmail).mock.calls[0];
    expect(call?.[0]).toBe(email);
    const url = new URL(call?.[2] ?? "");
    expect(
      (await request(`/verify-email?token=${url.searchParams.get("token")}`))
        .status,
    ).toBe(200);
    expect(
      (store["authUsers"]?.[0] as { emailVerified: boolean }).emailVerified,
    ).toBe(true);
  });
  it("resets passwords with single-use tokens and revokes all sessions", async () => {
    const cookie = await signUp();
    await AuthUtils.sendForgotPasswordEmail(email);
    const url = new URL(
      vi.mocked(emailQueue.sendForgotPasswordEmail).mock.calls[0]?.[2] ?? "",
    );
    const token = url.pathname.split("/").at(-1) ?? "";
    const reset = await request("/reset-password", {
      token,
      newPassword: "Replacement1!",
    });
    expect(reset.status).toBe(200);
    await expect(
      AuthUtils.verifySession(new Headers({ cookie })),
    ).rejects.toThrow("Session expired or revoked");
    expect(
      (
        await request("/reset-password", {
          token,
          newPassword: "AnotherPassword1!",
        })
      ).status,
    ).toBe(400);
    expect((await request("/sign-in/email", { email, password })).status).toBe(
      401,
    );
    expect(
      (await request("/sign-in/email", { email, password: "Replacement1!" }))
        .status,
    ).toBe(200);
  });
  it("does not reveal whether a reset email exists", async () => {
    const response = await auth.api.requestPasswordReset({
      body: { email: "missing@example.com" },
    });
    expect(response.status).toBe(true);
    expect(emailQueue.sendForgotPasswordEmail).not.toHaveBeenCalled();
  });
  it("deletes authentication, linked credentials, and sessions idempotently", async () => {
    const cookie = await signUp();
    const session = await AuthUtils.verifySession(new Headers({ cookie }));
    await AuthUtils.deleteUser(session.uid);
    await AuthUtils.deleteUser(session.uid);
    expect(store["authUsers"]).toHaveLength(0);
    expect(store["authAccounts"]).toHaveLength(0);
    expect(store["authSessions"]).toHaveLength(0);
  });
  it("keeps public requests anonymous when only unrelated cookies are present", async () => {
    const response = await app.request("http://localhost:5005/configuration", {
      headers: { cookie: "theme=dark" },
    });
    expect(response.status).toBe(200);
  });
  it("resolves auth rate-limit addresses through the API proxy policy", async () => {
    const response = await app.request(
      "http://localhost:5005/auth/sign-up/email",
      {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.4, 203.0.113.5",
          "x-oxytype-auth-ip": "192.0.2.1",
        },
        body: JSON.stringify({ name: "NewUser", email, password }),
      },
    );
    expect(response.status).toBe(200);
    const session = await request("/get-session", undefined, cookies(response));
    expect(await session.json()).toMatchObject({
      session: { ipAddress: "203.0.113.5" },
    });
  });
  it("blocks cookie-authenticated mutations from foreign origins", async () => {
    const cookie = await signUp();
    const response = await app.request("http://localhost:5005/users/email", {
      method: "PATCH",
      headers: {
        cookie,
        origin: "https://attacker.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        newEmail: "attacker@example.com",
        previousEmail: email,
      }),
    });
    expect(response.status).toBe(403);
  });
  it("prevents unlinking the last authentication method", async () => {
    const cookie = await signUp();
    const accounts = await getAuthAccounts(cookie);
    expect(
      (await request("/unlink-account", { accountId: accounts[0]?.id }, cookie))
        .status,
    ).toBe(400);
    expect(store["authAccounts"]).toHaveLength(1);
  });
  it("requires a fresh OAuth session when setting a password", async () => {
    const context = await auth.$context;
    const user = await context.internalAdapter.createUser(
      {
        name: "OAuthUser",
        email: "oauth@example.com",
        emailVerified: true,
      },
      { method: "oauth", oauth: { providerId: "google" } },
    );
    await context.internalAdapter.createAccount({
      userId: user.id,
      providerId: "google",
      accountId: "google-id",
    });
    const session = await context.internalAdapter.createSession(user.id);
    if (session === null) throw new Error("Missing test session");
    const setPassword = async (): Promise<Response> =>
      app.request("http://localhost:5005/auth/set-password", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.token}`,
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ newPassword: password }),
      });
    await context.internalAdapter.updateSession(session.token, {
      createdAt: new Date(Date.now() - 61_000),
    });
    expect((await setPassword()).status).toBe(403);
    expect(store["authAccounts"]).toHaveLength(1);
    await context.internalAdapter.updateSession(session.token, {
      createdAt: new Date(),
    });
    const response = await setPassword();
    expect(response.status).toBe(200);
    expect(
      (await request("/sign-in/email", { email: user.email, password })).status,
    ).toBe(200);
  });
  it("preserves OAuth session-only preference in a signed cookie", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-secret");
    try {
      auth = createAuth(memoryAdapter(store));
      vi.spyOn(AuthInit, "getAuth").mockReturnValue(auth);
      const response = await request("/sign-in/social", {
        provider: "google",
        callbackURL: "http://localhost:3000/email-handler",
        disableRedirect: true,
        additionalData: { rememberMe: false },
      });
      expect(response.status).toBe(200);
      expect(
        response.headers
          .getSetCookie()
          .some(
            (cookie) =>
              cookie.includes("dont_remember=") && cookie.includes("HttpOnly"),
          ),
      ).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("requires production secrets and a public auth URL", () => {
    vi.stubEnv("MODE", "prod");
    vi.stubEnv("FRONTEND_URL", "http://localhost:3000");
    vi.stubEnv("BETTER_AUTH_SECRET", undefined);
    vi.stubEnv("BETTER_AUTH_URL", undefined);
    try {
      expect(() => createAuth(memoryAdapter(store))).toThrow(
        "BETTER_AUTH_SECRET",
      );
      vi.stubEnv(
        "BETTER_AUTH_SECRET",
        "test-secret-with-at-least-thirty-two-characters",
      );
      expect(() => createAuth(memoryAdapter(store))).toThrow("BETTER_AUTH_URL");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

async function getAuthAccounts(cookie: string): Promise<{ id: string }[]> {
  return auth.api.listUserAccounts({ headers: new Headers({ cookie }) });
}
