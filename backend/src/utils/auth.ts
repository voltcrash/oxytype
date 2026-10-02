import { getAuth } from "../init/auth";
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

export async function deleteUser(uid: string): Promise<void> {
  await (await getAuth().$context).internalAdapter.deleteUser(uid);
}

export async function revokeTokensByUid(uid: string): Promise<void> {
  await (await getAuth().$context).internalAdapter.deleteUserSessions(uid);
}
