import { NewPasswordSchema, PasswordSchema } from "@oxytype/schemas/users";
import { typedKeys } from "@oxytype/util/objects";
import { tryCatch } from "@oxytype/util/trycatch";
import { createMemo } from "solid-js";
import { z, ZodString } from "zod/v3";

import Ape from "./ape";
import {
  authClient,
  checkAuthResult,
  refreshSession,
  requestOAuth,
  updateProfile,
  type AuthUser as User,
  type AuthUser as UserType,
  type SocialProvider,
  signOut as authSignOut,
  createUserWithEmailAndPassword,
  getAuthenticatedUser,
  isAuthAvailable,
  resetIgnoreAuthCallback,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "./auth-client";
import { waitForPresetsReady } from "./collections/presets";
import { waitForTagsReady } from "./collections/tags";
import { updateFromServer as updateConfigFromServer } from "./config/remote";
import * as DB from "./db";
import { authEvent } from "./events/auth";
import * as Sentry from "./sentry";
import { setUserId } from "./states/core";
import { hideLoaderBar, showLoaderBar } from "./states/loader-bar";
import {
  showErrorNotification,
  showNoticeNotification,
  showSuccessNotification,
} from "./states/notifications";
import { FaObject } from "./types/font-awesome";
import { isDevEnvironment } from "./utils/env";
import { createErrorMessage } from "./utils/error";
import { SnapshotInitError } from "./utils/snapshot-init-error";
import { OneOf } from "./utils/types";

type AuthMethodInfo = {
  display: string;
  fa: FaObject;
} & OneOf<{
  provider: SocialProvider;
  providerId: string;
}>;

/**
 * auth methods, keep order from most to least preferred.
 * This is used for reauthenticate
 */
const authMethods = {
  password: {
    display: "Password",
    providerId: "password",
    fa: { icon: "fa-lock" },
  },
  github: {
    display: "GitHub",
    provider: "github",
    fa: { variant: "brand", icon: "fa-github" },
  },
  google: {
    display: "Google",
    provider: "google",
    fa: { variant: "brand", icon: "fa-google" },
  },
} as const satisfies Record<string, AuthMethodInfo>;

export type AuthMethod = keyof typeof authMethods;
export type ProviderAuthMethod = Exclude<AuthMethod, "password">;

export type AuthResult =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    };

type ReauthSuccess = {
  status: "success";
  message: string;
  user: User;
};

type ReauthFailed = {
  status: "error" | "notice";
  message: string;
};

type ReauthenticateOptions = {
  excludeMethod?: AuthMethod;
  password?: string;
};

const authenticationMemos = Object.fromEntries(
  typedKeys(authMethods).map((authMethod) => {
    const memo = createMemo(() => {
      const providerId = getProviderId(authMethod);

      const user = getAuthenticatedUser();
      if (user === null) return undefined;
      const provider = user.providerData.find(
        (p) => p.providerId === providerId,
      );
      const result = {
        isInUse: provider !== undefined,
        email: provider?.email ?? undefined,
        hasAdditionalAuthMethods: hasAdditionalAuthMethods(authMethod),
      };

      return result;
    });
    return [authMethod, memo];
  }),
);

export async function sendVerificationEmail(): Promise<void> {
  if (!isAuthAvailable()) {
    showErrorNotification("Authentication uninitialized", { durationMs: 3000 });
    return;
  }

  showLoaderBar();
  const response = await Ape.users.verificationEmail();
  if (response.status !== 200) {
    hideLoaderBar();
    showErrorNotification("Failed to request verification email", { response });
  } else {
    hideLoaderBar();
    showSuccessNotification("Verification email sent");
  }
}

async function getDataAndInit(): Promise<boolean> {
  try {
    console.log("getting account data");
    const snapshot = await DB.initSnapshot();
    //TODO: preload collections for now, remove when __nonReactive is removed from collections
    await waitForPresetsReady();
    await waitForTagsReady();

    if (snapshot === false) {
      throw new Error(
        "Snapshot didn't initialize due to lacking authentication even though user is authenticated",
      );
    }

    void Sentry.setUser(snapshot.uid, snapshot.name);

    await updateConfigFromServer();
    return true;
  } catch (error) {
    console.error(error);
    if (error instanceof SnapshotInitError) {
      if (error.responseCode === 429) {
        showNoticeNotification(
          "Doing so will save you bandwidth, make the next test be ready faster and will not sign you out (which could mean your new personal best would not save to your account).",
          {
            durationMs: 0,
          },
        );
        showNoticeNotification(
          "You will run into this error if you refresh the website to restart the test. It is NOT recommended to do that. Instead, use tab + enter or just tab (with quick tab mode enabled) to restart the test.",
          {
            durationMs: 0,
          },
        );
      }

      showErrorNotification(`Failed to get user data: ${error.message}`);
    } else {
      showErrorNotification("Failed to get user data", { error });
    }
    return false;
  }
}

export async function loadUser(_user: UserType): Promise<void> {
  if (!(await getDataAndInit())) {
    signOut();
    return;
  }
  authEvent.dispatch({ type: "snapshotUpdated", data: { isInitial: true } });
}

export async function onAuthStateChanged(
  authInitialisedAndConnected: boolean,
  user: UserType | null,
): Promise<void> {
  console.debug(`account controller ready`);

  let userPromise: Promise<void> = Promise.resolve();

  if (authInitialisedAndConnected) {
    console.debug(`auth state changed, user ${user ? "true" : "false"}`);
    if (user) {
      setUserId(user.uid);
      userPromise = loadUser(user);
    } else {
      setUserId(null);
      DB.setSnapshot(undefined);
    }
  }

  if (!authInitialisedAndConnected || !user) {
    void Sentry.clearUser();
  }

  authEvent.dispatch({
    type: "authStateChanged",
    data: { isUserSignedIn: user !== null, loadPromise: userPromise },
  });
}

export async function signIn(
  email: string,
  password: string,
  rememberMe: boolean,
): Promise<AuthResult> {
  if (!isAuthAvailable()) {
    return { success: false, message: "Authentication uninitialized" };
  }

  const { error } = await tryCatch(
    signInWithEmailAndPassword(email, password, rememberMe),
  );

  if (error !== null) {
    return { success: false, message: error.message };
  }
  return { success: true };
}

export async function signInWithProvider(
  authMethod: AuthMethod,
  options: { rememberMe: boolean },
): Promise<AuthResult> {
  if (!isAuthAvailable()) {
    return { success: false, message: "Authentication uninitialized" };
  }

  const provider = getAuthProvider(authMethod);
  if (provider === undefined) {
    return {
      success: false,
      message: `Authentication ${authMethod} is missing a provider`,
    };
  }

  const { error } = await tryCatch(
    signInWithPopup(provider, options.rememberMe),
  );

  if (error !== null) {
    return { success: false, message: error.message };
  }
  return { success: true };
}

export async function addAuthProvider(
  options:
    | { authMethod: ProviderAuthMethod }
    | {
        authMethod: "password";
        email: string;
        password: string;
      },
): Promise<void> {
  if (!isAuthAvailable()) {
    showErrorNotification("Authentication uninitialized", { durationMs: 3000 });
    return;
  }
  const authMethod = options.authMethod;

  const user = getAuthenticatedUser();
  const providerName = getAuthMethodDisplay(authMethod);

  if (!user) return;
  showLoaderBar();
  try {
    if (authMethod === "password") {
      await addPasswordProvider(user, options);
    } else {
      await addPopupProvider(user, options);
    }

    showSuccessNotification(`${providerName} authentication added`);
  } catch (error) {
    showErrorNotification(`Failed to add ${providerName} authentication`, {
      error,
    });
  } finally {
    hideLoaderBar();
  }
}

async function addPasswordProvider(
  user: User,
  options: {
    email: string;
    password: string;
  },
) {
  const reauth = await reauthenticate({ password: options.password });
  if (reauth.status !== "success") {
    throw new Error(reauth.message);
  }
  if (options.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error(
      "Use your account email when adding password authentication",
    );
  }
  checkAuthResult(
    await authClient.$fetch("/set-password", {
      method: "POST",
      body: { newPassword: options.password },
    }),
  );
  await refreshSession(false);
  authEvent.dispatch({ type: "authConfigUpdated" });
}

async function addPopupProvider(
  user: User,
  options: { authMethod: ProviderAuthMethod },
) {
  const authMethod = options.authMethod;
  const provider = getAuthProvider(authMethod);
  if (provider === undefined) {
    throw new Error(`Authentication ${authMethod} is missing a provider`);
  }

  await requestOAuth(provider, true);
  await refreshSession(false);
  authEvent.dispatch({ type: "authConfigUpdated" });
}

export async function removeAuthProvider(
  authMethod: AuthMethod,
  options?: { password?: string },
): Promise<ReauthSuccess | ReauthFailed> {
  const reauth = await reauthenticate({
    password: options?.password,
    excludeMethod: authMethod,
  });
  if (reauth.status !== "success") {
    return {
      status: reauth.status,
      message: reauth.message,
    };
  }
  try {
    const accounts = checkAuthResult(await authClient.listAccounts());
    const account = accounts?.find(
      (entry) =>
        entry.providerId ===
        (authMethod === "password" ? "credential" : authMethod),
    );
    if (!account) throw new Error("Authentication method not found");
    checkAuthResult(await authClient.unlinkAccount({ accountId: account.id }));
    await refreshSession(false);
  } catch (e) {
    const message = createErrorMessage(
      e,
      authMethod === "password"
        ? "Failed to remove password authentication"
        : `Failed to unlink ${getAuthMethodDisplay(authMethod)} account`,
    );
    return {
      status: "error",
      message,
    };
  }
  return {
    status: "success",
    message: `${getAuthMethodDisplay(authMethod)} authentication removed`,
    user: reauth.user,
  };
}

export function signOut(): void {
  if (!isAuthAvailable()) {
    showErrorNotification("Authentication uninitialized", { durationMs: 3000 });
    return;
  }
  if (getAuthenticatedUser() === null) return;
  void authSignOut();
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  captchaToken: string,
): Promise<AuthResult> {
  if (!isAuthAvailable()) {
    return { success: false, message: "Authentication uninitialized" };
  }

  try {
    const createdAuthUser = await createUserWithEmailAndPassword(
      name,
      email,
      password,
    );

    const signInResponse = await Ape.users.create({
      body: {
        name: name,
        captcha: captchaToken,
        email,
        uid: createdAuthUser.user.uid,
      },
    });
    if (signInResponse.status !== 200) {
      throw new Error(`Failed to sign in: ${signInResponse.body.message}`);
    }

    await updateProfile(name);
    await sendVerificationEmail();
    await onAuthStateChanged(true, createdAuthUser.user);
    resetIgnoreAuthCallback();

    showSuccessNotification("Account created");
    return { success: true };
  } catch (e) {
    const message = createErrorMessage(e, "Failed to create account");

    showErrorNotification(message);
    signOut();
    return { success: false, message };
  }
}

function getAuthProvider(authMethod: AuthMethod): SocialProvider | undefined {
  const info = authMethods[authMethod] as AuthMethodInfo;
  return info.provider;
}

export async function reauthenticate(
  options: ReauthenticateOptions,
): Promise<ReauthSuccess | ReauthFailed> {
  if (!isAuthAvailable()) {
    return {
      status: "error",
      message: "Authentication is not initialized",
    };
  }

  const user = getAuthenticatedUser();
  if (user === null) {
    return {
      status: "error",
      message: "User is not signed in",
    };
  }

  const authMethod = getPreferredAuthenticationMethod(options.excludeMethod);

  try {
    if (authMethod === undefined) {
      return {
        status: "error",
        message:
          "Failed to reauthenticate: there is no valid authentication present on the account.",
      };
    }

    if (authMethod === "password") {
      if (options.password === undefined) {
        return {
          status: "error",
          message: "Failed to reauthenticate using password: password missing.",
        };
      }
      const result = checkAuthResult(
        await authClient.signIn.email({
          email: user.email,
          password: options.password,
        }),
      );
      if (result?.user.id !== user.uid) {
        throw new Error("Reauthentication changed the signed-in account");
      }
    } else {
      await requestOAuth(authMethod);
    }
    const refreshed = await refreshSession(false);
    if (refreshed?.uid !== user.uid) {
      await authSignOut();
      throw new Error("Reauthenticate with the same account");
    }

    return {
      status: "success",
      message: "Reauthenticated",
      user,
    };
  } catch (e) {
    return {
      status: "error",
      message: createErrorMessage(e, "Failed to reauthenticate"),
    };
  }
}

function getPreferredAuthenticationMethod(
  exclude?: AuthMethod,
): AuthMethod | undefined {
  const filteredMethods = typedKeys(authMethods).filter((it) => it !== exclude);
  for (const method of filteredMethods) {
    if (isUsingAuthentication(method)) return method;
  }
  return undefined;
}

function isUsingAuthentication(authMethod: AuthMethod): boolean {
  const providerId = getProviderId(authMethod);
  return (
    getAuthenticatedUser()?.providerData.some(
      (p) => p.providerId === providerId,
    ) ?? false
  );
}

export function isUsingAuthenticationReactive(authMethod: AuthMethod): boolean {
  return authenticationMemos[authMethod]?.()?.isInUse ?? false;
}

/**
 * Returns the Zod schema for password validation.
 *
 * Set `isNew: true` for registration/creation flows (strict rules).
 * Omit it for re-authentication flows (lenient: just non-empty).
 *
 * @param options - Set `isNew: true` for password creation/registration.
 * @returns A Zod string schema.
 */
export function getPasswordSchema(options?: { isNew: boolean }): ZodString {
  if (!options?.isNew) return PasswordSchema;
  if (isDevEnvironment()) return z.string().min(6);
  return NewPasswordSchema;
}

export function isUsingPasswordAuthentication(): boolean {
  return isUsingAuthentication("password");
}

export function hasAdditionalAuthMethods(authMethod: AuthMethod) {
  return typedKeys(authMethods).some(
    (it) => it !== authMethod && isUsingAuthentication(it),
  );
}

export function getAuthMethodEmailReactive(
  authMethod: AuthMethod,
): string | undefined {
  return authenticationMemos[authMethod]?.()?.email;
}

export function hasAdditionalAuthMethodsReactive(authMethod: AuthMethod) {
  return authenticationMemos[authMethod]?.()?.hasAdditionalAuthMethods ?? false;
}

export function getAuthMethodDisplay(authMethod: AuthMethod): string {
  return authMethods[authMethod].display;
}

export function getAuthMethodIcon(authMethod: AuthMethod): FaObject {
  return authMethods[authMethod].fa;
}

function getProviderId(authMethod: AuthMethod): string {
  const info = authMethods[authMethod];

  if ("provider" in info) {
    return info.provider;
  }
  return info.providerId;
}
