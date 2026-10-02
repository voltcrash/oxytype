import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { createAuth, getAuth, init } from "../../../src/init/auth";
import * as AuthInit from "../../../src/init/auth";
import { getDb } from "../../../src/init/db";
import * as AuthUtils from "../../../src/utils/auth";
import * as UserDAL from "../../../src/dal/user";
import { buildApp } from "../../../src/app";

beforeEach(async () => {
  for (const name of [
    "authUsers",
    "authAccounts",
    "authSessions",
    "authVerifications",
    "authRateLimits",
    "users",
  ]) {
    await getDb()?.collection(name).deleteMany({});
  }
  await init();
});
async function signUp(
  email = "newuser@example.com",
): Promise<{ cookie: string; uid: string }> {
  const response = await getAuth().api.signUpEmail({
    body: { email, name: "NewUser", password: "StrongPassword1!" },
    asResponse: true,
  });
  expect(response.status).toBe(200);
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const session = await AuthUtils.verifySession(new Headers({ cookie }));
  return { cookie, uid: session.uid };
}

describe("Better Auth MongoDB", () => {
  it("persists string IDs, credentials, and revocable sessions in dedicated collections", async () => {
    const { cookie, uid } = await signUp();
    expect(
      await getDb()
        ?.collection<{ _id: string }>("authUsers")
        .findOne({ _id: uid }),
    ).not.toBeNull();
    expect(
      await getDb()?.collection("authAccounts").countDocuments({ userId: uid }),
    ).toBe(1);
    await AuthUtils.revokeTokensByUid(uid);
    await expect(
      AuthUtils.verifySession(new Headers({ cookie })),
    ).rejects.toThrow("Session expired or revoked");
  });
  it("updates profile emails and revokes sessions on email changes", async () => {
    const { cookie, uid } = await signUp();
    await UserDAL.addUser("NewUser", "newuser@example.com", uid);
    await AuthUtils.updateUserEmail(uid, "replacement@example.com");
    expect((await UserDAL.getUser(uid, "test")).email).toBe(
      "replacement@example.com",
    );
    await expect(
      AuthUtils.verifySession(new Headers({ cookie })),
    ).rejects.toThrow("Session expired or revoked");
  });
  it("changes the credential hash and invalidates the old password and sessions", async () => {
    const { cookie, uid } = await signUp();
    await AuthUtils.updateUserPassword(uid, "Replacement1!");
    await expect(
      AuthUtils.verifySession(new Headers({ cookie })),
    ).rejects.toThrow("Session expired or revoked");
    await expect(
      getAuth().api.signInEmail({
        body: { email: "newuser@example.com", password: "StrongPassword1!" },
      }),
    ).rejects.toThrow();
    await expect(
      getAuth().api.signInEmail({
        body: { email: "newuser@example.com", password: "Replacement1!" },
      }),
    ).resolves.toHaveProperty("user.id", uid);
  });
  it("removes linked accounts and all sessions when deleting an identity", async () => {
    const { uid } = await signUp();
    await AuthUtils.deleteUser(uid);
    expect(await getDb()?.collection("authUsers").countDocuments()).toBe(0);
    expect(await getDb()?.collection("authAccounts").countDocuments()).toBe(0);
    expect(await getDb()?.collection("authSessions").countDocuments()).toBe(0);
  });
  it("works with a public /api/auth URL after the proxy strips /api", async () => {
    const db = getDb();
    if (db === undefined) throw new Error("Missing test database");
    const originalUrl = process.env["BETTER_AUTH_URL"];
    process.env["BETTER_AUTH_URL"] = "http://localhost:5005/api/auth";
    const auth = createAuth(mongodbAdapter(db, { transaction: false }));
    const spy = vi.spyOn(AuthInit, "getAuth").mockReturnValue(auth);
    try {
      const app = buildApp();
      const response = await app.request(
        "http://localhost:5005/auth/sign-up/email",
        {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            name: "NewUser",
            email: "proxy@example.com",
            password: "StrongPassword1!",
          }),
        },
      );
      expect(response.status).toBe(200);
      const cookie = response.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      const session = await app.request(
        "http://localhost:5005/auth/get-session",
        { headers: { cookie } },
      );
      expect(await session.json()).toMatchObject({
        user: { email: "proxy@example.com" },
      });
    } finally {
      spy.mockRestore();
      if (originalUrl === undefined) delete process.env["BETTER_AUTH_URL"];
      else process.env["BETTER_AUTH_URL"] = originalUrl;
    }
  });
  it("cancels unfinished signups without deleting completed accounts", async () => {
    const { cookie } = await signUp();
    const app = buildApp();
    const cancel = await app.request(
      "http://localhost:5005/auth/cancel-sign-up",
      { method: "POST", headers: { origin: "http://localhost:3000", cookie } },
    );
    expect(cancel.status).toBe(200);
    expect(await getDb()?.collection("authUsers").countDocuments()).toBe(0);
    const completed = await signUp();
    await UserDAL.addUser("NewUser", "newuser@example.com", completed.uid);
    const blocked = await app.request(
      "http://localhost:5005/auth/cancel-sign-up",
      {
        method: "POST",
        headers: { origin: "http://localhost:3000", cookie: completed.cookie },
      },
    );
    expect(blocked.status).toBe(409);
    expect(
      (await AuthUtils.verifySession(new Headers({ cookie: completed.cookie })))
        .uid,
    ).toBe(completed.uid);
  });
});
