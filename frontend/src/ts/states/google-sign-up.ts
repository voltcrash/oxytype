import type { UserCredential } from "../auth-types";

let pendingUser: UserCredential | undefined = undefined;

export function getPendingGoogleSignUpUser(): UserCredential | undefined {
  return pendingUser;
}

export function setPendingGoogleSignUpUser(
  user: UserCredential | undefined,
): void {
  pendingUser = user;
}
