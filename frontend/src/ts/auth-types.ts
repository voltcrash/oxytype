export type AuthUser = {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  providerData: { providerId: string; email: string | null }[];
};
export type UserCredential = { user: AuthUser };
export type SocialProvider = "google" | "github";
