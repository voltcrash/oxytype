import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { createAuth, getAuth, init } from "../../../src/init/auth";
import * as AuthInit from "../../../src/init/auth";
import { getDb } from "../../../src/init/db";
import * as AuthUtils from "../../../src/utils/auth";
import * as UserDAL from "../../../src/dal/user";
import { buildApp } from "../../../src/app";
import { signInWithOAuth } from "../../__testData__/oauth";

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
  for (const provider of ["GOOGLE", "GITHUB"]) {
    vi.stubEnv(`${provider}_CLIENT_ID`, "test-client");
    vi.stubEnv(`${provider}_CLIENT_SECRET`, "test-secret");
  }
  const db = getDb();
  if (!db) throw new Error("Missing test database");
  const auth = createAuth(mongodbAdapter(db, { transaction: false }));
  vi.spyOn(AuthInit, "getAuth").mockReturnValue(auth);
  await init();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
async function signIn(
  email = "newuser@example.com",
): Promise<{ cookie: string; uid: string }> {
  const { cookie } = await signInWithOAuth(getAuth(), buildApp(), { email });
  const session = await AuthUtils.verifySession(new Headers({ cookie }));
  return { cookie, uid: session.uid };
}

describe("Better Auth MongoDB", () => {
  it("persists string IDs, OAuth accounts, and revocable sessions", async () => {
    const { cookie, uid } = await signIn();
    expect(
      await getDb()
        ?.collection<{ _id: string }>("authUsers")
        .findOne({ _id: uid }),
    ).not.toBeNull();
    const accounts = await getDb()
      ?.collection("authAccounts")
      .find({ userId: uid })
      .toArray();
    expect(accounts).toHaveLength(1);
    expect(accounts?.[0]).toMatchObject({ providerId: "google" });
    expect(accounts?.[0]).not.toHaveProperty("password");
    await AuthUtils.revokeTokensByUid(uid);
    await expect(
      AuthUtils.verifySession(new Headers({ cookie })),
    ).rejects.toThrow("Session expired or revoked");
  });
  it("syncs provider profile email updates to application users", async () => {
    const { uid } = await signIn();
    await UserDAL.addUser("NewUser", "newuser@example.com", uid);
    await (
      await getAuth().$context
    ).internalAdapter.updateUser(uid, {
      email: "replacement@example.com",
    });
    expect((await UserDAL.getUser(uid, "test")).email).toBe(
      "replacement@example.com",
    );
  });
  it("removes linked accounts and sessions when deleting an identity", async () => {
    const { uid } = await signIn();
    await AuthUtils.deleteUser(uid);
    expect(await getDb()?.collection("authUsers").countDocuments()).toBe(0);
    expect(await getDb()?.collection("authAccounts").countDocuments()).toBe(0);
    expect(await getDb()?.collection("authSessions").countDocuments()).toBe(0);
  });
  it("works with a public /api/auth URL after the proxy strips /api", async () => {
    const db = getDb();
    if (!db) throw new Error("Missing test database");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:5005/api/auth");
    const auth = createAuth(mongodbAdapter(db, { transaction: false }));
    vi.spyOn(AuthInit, "getAuth").mockReturnValue(auth);
    const app = buildApp();
    const { cookie } = await signInWithOAuth(auth, app, {
      email: "proxy@example.com",
    });
    const session = await app.request(
      "http://localhost:5005/auth/get-session",
      {
        headers: { cookie },
      },
    );
    expect(await session.json()).toMatchObject({
      user: { email: "proxy@example.com" },
    });
  });
  it("cancels unfinished signups without deleting completed accounts", async () => {
    const { cookie } = await signIn();
    const app = buildApp();
    const cancel = await app.request(
      "http://localhost:5005/auth/cancel-sign-up",
      {
        method: "POST",
        headers: { origin: "http://localhost:3000", cookie },
      },
    );
    expect(cancel.status).toBe(200);
    expect(await getDb()?.collection("authUsers").countDocuments()).toBe(0);
    const completed = await signIn();
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
