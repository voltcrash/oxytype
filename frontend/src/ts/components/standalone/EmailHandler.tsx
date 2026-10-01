import {
  applyActionCode,
  Auth,
  checkActionCode,
  confirmPasswordReset,
  signInWithEmailAndPassword,
  verifyPasswordResetCode,
} from "firebase/auth";
import { createSignal, JSXElement, onMount, Show } from "solid-js";

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
  const results = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`).exec(
    window.location.href,
  );
  if (results === null) return null;
  if (results[2] === undefined || results[2] === "") return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

export function EmailHandler(props: {
  initializeAuth: () => Auth;
}): JSXElement {
  const [label, setLabel] = createSignal("Email Handler");
  const [icon, setIcon] = createSignal<
    "fa-circle-notch" | "fa-check" | "fa-times"
  >("fa-circle-notch");
  const [text, setText] = createSignal("‎");
  const [subtext, setSubtext] = createSignal("‎");
  const [isResetVisible, setResetVisible] = createSignal(false);
  const [isRecovered, setRecovered] = createSignal(false);
  const [passwordRef, passwordInput] = useRef<HTMLInputElement>();
  const [confirmationRef, confirmationInput] = useRef<HTMLInputElement>();
  let auth: Auth;
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
      const email = await verifyPasswordResetCode(auth, actionCode);
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
      await confirmPasswordReset(auth, actionCode, password);
      setIcon("fa-check");
      setText("Your password has been changed");
      setSubtext("You can now close this tab");
      void signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      fail(error);
    }
  };
  const verifyEmail = async (): Promise<void> => {
    try {
      await applyActionCode(auth, actionCode);
      setIcon("fa-check");
      setText("Your email address has been verified");
      setSubtext("You can now close this tab");
    } catch (error) {
      fail(error);
    }
  };
  const recoverEmail = async (code?: string): Promise<void> => {
    try {
      // Preserve the old caller/signature mismatch: its second argument was
      // undefined. Fixing recovery is a separate behavior change.
      await checkActionCode(auth, code as string);
      await applyActionCode(auth, code as string);
      setIcon("fa-check");
      setText("Your account email was reverted.");
      setSubtext("");
      setRecovered(true);
    } catch (error) {
      fail(error, false);
    }
  };

  onMount(() => {
    // Initialize after rendering, preserving the loading UI if SDK setup fails.
    try {
      const mode = getParameterByName("mode");
      actionCode = getParameterByName("oobCode") ?? "";
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
      auth = props.initializeAuth();
      switch (mode) {
        case "resetPassword":
          setLabel("Reset Password");
          document.title = "Reset Password | Oxytype";
          showResetPassword();
          break;
        case "recoverEmail":
          void recoverEmail();
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
          <Show when={isRecovered()}>
            <br />
            In case you believe your account was compromised, please request a
            password reset email:
            <br />
            <div
              class="button"
              onClick={() => {
                // The original inline handler could not access its module-local
                // function. Preserve that error rather than change auth behavior.
                throw new ReferenceError("sendPasswordReset is not defined");
              }}
            >
              Send Password Reset Email
            </div>
          </Show>
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
