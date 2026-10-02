import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { createTestRuntime } from "./helpers";
import { withRuntime } from "../../src/runtime/env";
import { getAuth } from "../../src/init/auth";
import { verifySession } from "../../src/utils/auth";

describe("Better Auth D1 adapter", () => {
  let test: Awaited<ReturnType<typeof createTestRuntime>>;
  beforeAll(async () => {
    test = await createTestRuntime();
    test.env.BETTER_AUTH_URL = "http://localhost:5005/api/auth";
    test.env.BETTER_AUTH_SECRET =
      "local-test-secret-at-least-thirty-two-characters";
  });
  afterAll(async () => {
    await test?.dispose();
  });
  it("persists sessions, rejects disabled users, and observes revocation", async () => {
    await withRuntime(test.env, async () => {
      const context = await getAuth().$context;
      const user = await context.internalAdapter.createUser(
        { name: "Auth", email: "auth@example.com", emailVerified: true },
        { method: "oauth", oauth: { providerId: "google" } },
      );
      const session = await context.internalAdapter.createSession(
        user.id,
        false,
      );
      expect(session).not.toBeNull();
      const headers = new Headers({
        authorization: `Bearer ${session?.token}`,
      });
      expect((await verifySession(headers)).uid).toBe(user.id);
      await context.internalAdapter.deleteSession(session?.token ?? "");
      await expect(verifySession(headers)).rejects.toThrow();
      await test.env.DB.prepare("UPDATE auth_users SET disabled=1 WHERE id=?")
        .bind(user.id)
        .run();
      await expect(
        context.internalAdapter.createSession(user.id, false),
      ).rejects.toThrow(/disabled/);
    });
  });
});
