import type { UserCredential } from "../auth-types";
import { createEvent } from "../hooks/createEvent";

export type GoogleSignUpEventData = {
  signedInUser: UserCredential;
  isNewUser: boolean;
};

export const googleSignUpEvent = createEvent<GoogleSignUpEventData>();
