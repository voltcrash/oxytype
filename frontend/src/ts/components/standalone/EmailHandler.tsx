import type { authClient } from "../../auth-client";
function checkAuthResult(result: { error: { message?: string } | null }): void {
  if (result.error) {
    throw new Error(result.error.message ?? "Email action failed");
  }
}
import { createSignal, JSXElement, onMount } from "solid-js";

import { useRef } from "../../hooks/useRef";
import { cn } from "../../utils/cn";
import { Fa } from "../common/Fa";
import { StandaloneHeader } from "./StandaloneHeader";

function isPasswordStrong(password: string): boolean {
  return (
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) &&
    password.length >= 8 &&
    password.length <= 64
  );
}

function getParameterByName(name: string): string | null {
  return new URL(window.location.href).searchParams.get(name);
}

export function EmailHandler(props: {
  authClient?: Pick<typeof authClient, "resetPassword" | "verifyEmail">;
}): JSXElement {
  const getAuthClient = (): NonNullable<typeof props.authClient> => {
    if (props.authClient === undefined) {
      throw new Error("Authentication uninitialized");
    }
    return props.authClient;
  };
  const [label, setLabel] = createSignal("Email Handler");
  const [icon, setIcon] = createSignal<
    "fa-circle-notch" | "fa-check" | "fa-times"
  >("fa-circle-notch");
  const [text, setText] = createSignal("‎");
  const [subtext, setSubtext] = createSignal("‎");
  const [isResetVisible, setResetVisible] = createSignal(false);
  const [passwordRef, passwordInput] = useRef<HTMLInputElement>();
  const [confirmationRef, confirmationInput] = useRef<HTMLInputElement>();
  let actionCode = "";
  let hasActions = false;

  const showResetPassword = (): void => {
    setResetVisible(true);
    // Solid batches mount effects; focus after the hidden class has been removed.
    queueMicrotask(() => {
      const input = passwordInput();
      if (input?.isConnected) input.focus();
    });
  };
  const fail = (error: unknown, fatal = true): void => {
    console.error(error);
    setIcon("fa-times");
    const message = error instanceof Error ? error.message : String(error);
    setText(
      fatal
        ? `Fatal error: ${message}. If this issue persists, please report it.`
        : message,
    );
  };
  const resetPassword = async (): Promise<void> => {
    if (!hasActions) return;
    setResetVisible(false);
    try {
      const password = passwordInput()?.value ?? "";
      const confirmation = confirmationInput()?.value ?? "";
      if (password !== confirmation) {
        alert("Passwords do not match");
        showResetPassword();
        return;
      }
      if (!isPasswordStrong(password)) {
        alert(
          "Password must contain at least one capital letter, number, a special character and must be between 8 and 64 characters long",
        );
        showResetPassword();
        return;
      }
      checkAuthResult(
        await getAuthClient().resetPassword({
          token: actionCode,
          newPassword: password,
        }),
      );
      setIcon("fa-check");
      setText("Your password has been changed");
      setSubtext("You can now close this tab");
    } catch (error) {
      fail(error);
    }
  };
  const verifyEmail = async (): Promise<void> => {
    try {
      checkAuthResult(
        await getAuthClient().verifyEmail({ query: { token: actionCode } }),
      );
      setIcon("fa-check");
      setText("Your email address has been verified");
      setSubtext("You can now close this tab");
    } catch (error) {
      fail(error);
    }
  };

  onMount(() => {
    // Initialize after rendering, preserving the loading UI if SDK setup fails.
    try {
      const mode = getParameterByName("mode");
      actionCode = getParameterByName("token") ?? "";
      if (mode === "oauthCallback") {
        const error = getParameterByName("error");
        (window.opener as Window | null)?.postMessage(
          {
            type: "oxytype-auth",
            requestId: getParameterByName("requestId"),
            error,
          },
          window.location.origin,
        );
        window.close();
        setIcon(error !== null ? "fa-times" : "fa-check");
        setText(error ?? "You can close this tab");
        return;
      }
      if (getParameterByName("error") !== null) {
        setIcon("fa-times");
        setText(getParameterByName("error") ?? "Email action failed");
        return;
      }
      // Better Auth verifies the link on the server, then redirects here.
      if (mode === "verifyEmail" && !actionCode) {
        setLabel("Verify Email");
        document.title = "Verify Email | Oxytype";
        setIcon("fa-check");
        setText("Your email address has been verified");
        setSubtext("You can now close this tab");
        return;
      }
      if (mode === null || mode === "") {
        setIcon("fa-times");
        setText("Mode parameter not found");
        return;
      }
      if (actionCode === "") {
        setIcon("fa-times");
        setText("Action code parameter not found");
        return;
      }
      switch (mode) {
        case "resetPassword":
          setLabel("Reset Password");
          document.title = "Reset Password | Oxytype";
          showResetPassword();
          break;
        case "verifyEmail":
          setLabel("Verify Email");
          document.title = "Verify Email | Oxytype";
          void verifyEmail();
          break;
        default:
          setIcon("fa-times");
          setText("Invalid mode");
          console.error("no mode found");
      }
      hasActions = true;
    } catch (error) {
      fail(error);
    }
  });

  return (
    <>
      <StandaloneHeader label={label()} />
      <main class="grid justify-center text-text">
        <div
          class={cn(
            "preloader grid w-[350px] content-center items-center gap-4 text-center",
            isResetVisible() && "hidden",
          )}
        >
          <div class="icon text-[2rem] text-main">
            <Fa icon={icon()} fixedWidth spin={icon() === "fa-circle-notch"} />
          </div>
          <div class="text">{text()}</div>
          <div class="subText text-[1rem] text-sub italic">{subtext()}</div>
        </div>
        <div
          class={cn(
            "resetPassword grid w-[300px] content-center items-center gap-4",
            !isResetVisible() && "hidden",
          )}
        >
          <input
            ref={passwordRef}
            class="pwd box-border! [all:revert]"
            type="password"
            placeholder="New password"
            onKeyPress={(event) => {
              if (event.key === "Enter") void resetPassword();
            }}
          />
          <input
            ref={confirmationRef}
            class="pwd-confirm box-border! [all:revert]"
            type="password"
            placeholder="Confirm new password"
          />
          <div class="button" onClick={() => void resetPassword()}>
            Change
          </div>
        </div>
      </main>
    </>
  );
}
