import { randomUUID } from "node:crypto";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import { bearer } from "better-auth/plugins";
import { getDb } from "./db";
import { getFrontendUrl, isDevEnvironment } from "../utils/misc";
import * as UserDAL from "../dal/user";

export function createAuth(
  database: BetterAuthOptions["database"],
): ReturnType<typeof betterAuth> {
  const frontendUrl = getFrontendUrl();
  const secret = process.env["BETTER_AUTH_SECRET"];
  if (!isDevEnvironment() && (secret === undefined || secret.length < 32)) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }
  const socialProviders: BetterAuthOptions["socialProviders"] = {};
  for (const provider of ["google", "github"] as const) {
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
    if (
      clientId !== undefined &&
      clientId !== "" &&
      clientSecret !== undefined &&
      clientSecret !== ""
    ) {
      socialProviders[provider] = { clientId, clientSecret };
    }
  }
  const baseURL =
    process.env["BETTER_AUTH_URL"] ??
    (isDevEnvironment() ? "http://localhost:5005/auth" : undefined);
  if (baseURL === undefined) {
    throw new Error("BETTER_AUTH_URL must be configured for production");
  }
  const options: BetterAuthOptions = {
    appName: "Oxytype",
    // Better Auth accepts adapter factories through its database option.
    // oxlint-disable-next-line no-unsafe-assignment
    database,
    baseURL,
    basePath: new URL(baseURL).pathname,
    secret: secret ?? "oxytype-local-development-secret-only",
    trustedOrigins: [new URL(frontendUrl).origin],
    socialProviders,
    advanced: {
      database: { generateId: () => randomUUID() },
      cookiePrefix: "oxytype",
      ipAddress: { ipAddressHeaders: ["x-oxytype-auth-ip"] },
    },
    user: {
      modelName: "authUsers",
      additionalFields: {
        disabled: { type: "boolean", defaultValue: false, input: false },
      },
    },
    account: {
      modelName: "authAccounts",
      accountLinking: { enabled: true, allowDifferentEmails: false },
    },
    session: {
      modelName: "authSessions",
      freshAge: 60,
      cookieCache: { enabled: false },
    },
    verification: { modelName: "authVerifications" },
    disabledPaths: [
      "/sign-in/email",
      "/sign-up/email",
      "/request-password-reset",
      "/reset-password",
      "/change-password",
      "/set-password",
      "/verify-password",
      "/send-verification-email",
      "/verify-email",
      "/change-email",
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // disabledPaths matches exact URLs; also block legacy reset-token URLs.
        if (ctx.path.startsWith("/reset-password")) {
          throw new APIError("NOT_FOUND");
        }
        if (ctx.path === "/unlink-account") {
          const session = await getSessionFromCtx(ctx);
          if (session === null) return;
          const accounts = await ctx.context.internalAdapter.findAccounts(
            session.user.id,
          );
          const socialAccounts = accounts.filter((account) =>
            ["google", "github"].includes(account.providerId),
          );
          const body = ctx.body as { accountId?: string } | undefined;
          // Legacy credentials must not count as a usable remaining sign-in method.
          if (
            socialAccounts.length === 1 &&
            socialAccounts[0]?.id === body?.accountId
          ) {
            throw new APIError("BAD_REQUEST", {
              message: "Cannot unlink the last Google or GitHub account",
            });
          }
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/social") return;
        const body = ctx.body as
          | { additionalData?: { rememberMe?: boolean } }
          | undefined;
        const cookie = ctx.context.authCookies.dontRememberToken;
        if (body?.additionalData?.rememberMe === false) {
          await ctx.setSignedCookie(
            cookie.name,
            "true",
            ctx.context.secret,
            cookie.attributes,
          );
        } else {
          ctx.setCookie(cookie.name, "", { ...cookie.attributes, maxAge: 0 });
        }
      }),
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const authUser = await getDb()
              ?.collection<{ _id: string; disabled: boolean }>("authUsers")
              .findOne({ _id: session.userId });
            if (authUser?.disabled === true) {
              throw new APIError("FORBIDDEN", { message: "Account disabled" });
            }
          },
        },
      },
      user: {
        update: {
          after: async (user) => {
            // Provider profile updates keep the application email in sync.
            await UserDAL.getUsersCollection()?.updateOne(
              { uid: user.id },
              { $set: { email: user.email } },
            );
          },
        },
      },
    },
    plugins: [bearer()],
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "authRateLimits",
    },
  };
  return betterAuth(options);
}

let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth(): ReturnType<typeof createAuth> {
  if (auth === undefined) {
    const db = getDb();
    if (db === undefined) throw new Error("Database is not initialized");
    auth = createAuth(mongodbAdapter(db, { transaction: false }));
  }
  return auth;
}

export async function init(): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Database is not initialized");
  getAuth();
  await db.collection("authUsers").createIndex({ email: 1 }, { unique: true });
  await db
    .collection("authAccounts")
    .createIndex({ providerId: 1, accountId: 1 }, { unique: true });
  await db
    .collection("authSessions")
    .createIndex({ token: 1 }, { unique: true });
  await db.collection("authSessions").createIndex({ userId: 1 });
  await db
    .collection("authSessions")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db
    .collection("authVerifications")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
