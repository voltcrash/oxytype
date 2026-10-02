import { getAuth } from "../init/auth";
import { getFrontendUrl } from "./misc";
import MonkeyError from "./error";

export type AuthenticatedSession = {
  uid: string;
  email: string;
  createdAt: Date;
};

export async function verifySession(
  headers: Headers,
): Promise<AuthenticatedSession> {
  const result = await getAuth().api.getSession({
    headers,
    query: { disableCookieCache: true },
  });
  if (result === null) {
    throw new MonkeyError(
      401,
      "Session expired or revoked - please login again",
    );
  }
  return {
    uid: result.user.id,
    email: result.user.email,
    createdAt: result.session.createdAt,
  };
}

export async function updateUserEmail(
  uid: string,
  email: string,
): Promise<void> {
  const context = await getAuth().$context;
  const existing = await context.internalAdapter.findUserByEmail(email);
  if (existing && existing.user.id !== uid) {
    throw new MonkeyError(
      409,
      "The email address is already in use by another account",
    );
  }
  await context.internalAdapter.updateUser(uid, {
    email,
    emailVerified: false,
  });
  await revokeTokensByUid(uid);
}

export async function updateUserPassword(
  uid: string,
  password: string,
): Promise<void> {
  const context = await getAuth().$context;
  const accounts = await context.internalAdapter.findAccounts(uid);
  const credential = accounts.find(
    (account) => account.providerId === "credential",
  );
  if (!credential) {
    throw new MonkeyError(400, "Password authentication is not enabled");
  }
  await context.internalAdapter.updateAccount(credential.id, {
    password: await context.password.hash(password),
  });
  await revokeTokensByUid(uid);
}

export async function deleteUser(uid: string): Promise<void> {
  await (await getAuth().$context).internalAdapter.deleteUser(uid);
}

export async function revokeTokensByUid(uid: string): Promise<void> {
  await (await getAuth().$context).internalAdapter.deleteUserSessions(uid);
}

export async function sendVerificationEmail(email: string): Promise<void> {
  await getAuth().api.sendVerificationEmail({
    body: {
      email,
      callbackURL: `${getFrontendUrl()}/email-handler?mode=verifyEmail`,
    },
  });
}

export async function sendForgotPasswordEmail(email: string): Promise<void> {
  await getAuth().api.requestPasswordReset({
    body: {
      email,
      redirectTo: `${getFrontendUrl()}/email-handler?mode=resetPassword`,
    },
  });
}
