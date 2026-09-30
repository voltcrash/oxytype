import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import {
  applyActionCode,
  Auth,
  checkActionCode,
  confirmPasswordReset,
  signInWithEmailAndPassword,
  verifyPasswordResetCode,
} from "firebase/auth";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { EmailHandler } from "../../../src/ts/components/standalone/EmailHandler";

vi.mock("firebase/auth", () => ({
  applyActionCode: vi.fn(),
  checkActionCode: vi.fn(),
  confirmPasswordReset: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
}));
const auth = {} as Auth;
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(window, "alert").mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function mount(query: string): ReturnType<typeof render> {
  window.history.replaceState(null, "", `/?${query}`);
  return render(() => <EmailHandler initializeAuth={() => auth} />);
}

it.each([
  ["", "Mode parameter not found"],
  ["mode=verifyEmail", "Action code parameter not found"],
  ["mode=unknown&oobCode=code", "Invalid mode"],
  [
    "mode=verifyEmail&oobCode=%ZZ",
    "Fatal error: URI malformed. If this issue persists, please report it.",
  ],
])("retains parameter errors for %s", (query, message) => {
  const { container } = mount(query);
  expect(container.querySelector(".preloader .text")?.textContent).toBe(
    message,
  );
  expect(container.querySelector(".icon .fa-times")).not.toBeNull();
});

it("verifies a decoded code and updates title and completion text", async () => {
  vi.mocked(applyActionCode).mockResolvedValue();
  const { container } = mount("mode=verifyEmail&oobCode=a%2Bb+code");
  await waitFor(() =>
    expect(container.querySelector(".fa-check")).not.toBeNull(),
  );
  expect(applyActionCode).toHaveBeenCalledWith(auth, "a+b code");
  expect(document.title).toBe("Verify Email | Monkeytype");
  expect(container.querySelector("#logo span")?.textContent).toBe(
    "Verify Email",
  );
  expect(container.querySelector(".preloader .text")?.textContent).toBe(
    "Your email address has been verified",
  );
  expect(container.querySelector(".subText")?.textContent).toBe(
    "You can now close this tab",
  );
});

it("retains verification SDK failures", async () => {
  vi.mocked(applyActionCode).mockRejectedValue(new Error("expired"));
  const { container } = mount("mode=verifyEmail&oobCode=code");
  await waitFor(() =>
    expect(container.querySelector(".fa-times")).not.toBeNull(),
  );
  expect(container.querySelector(".preloader .text")?.textContent).toBe(
    "Fatal error: expired. If this issue persists, please report it.",
  );
});

it("retains reset validation order, focus and password-input Enter handling", async () => {
  vi.mocked(verifyPasswordResetCode).mockResolvedValue("user@example.test");
  vi.mocked(confirmPasswordReset).mockResolvedValue();
  const { container } = mount("mode=resetPassword&oobCode=code");
  const password = container.querySelector(".pwd") as HTMLInputElement;
  const confirmation = container.querySelector(
    ".pwd-confirm",
  ) as HTMLInputElement;
  const change = container.querySelector(".button") as HTMLDivElement;
  await waitFor(() => expect(document.activeElement).toBe(password));
  expect(verifyPasswordResetCode).not.toHaveBeenCalled();
  password.value = "Strong1!";
  confirmation.value = "different";
  fireEvent.click(change);
  await waitFor(() =>
    expect(window.alert).toHaveBeenCalledWith("Passwords do not match"),
  );
  expect(document.activeElement).toBe(password);
  expect(container.querySelector(".resetPassword")?.className).not.toContain(
    "hidden",
  );
  password.value = confirmation.value = "weak";
  fireEvent.click(change);
  await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(2));
  expect(confirmPasswordReset).not.toHaveBeenCalled();
  password.value = confirmation.value = "Strong1!";
  fireEvent.keyPress(confirmation, { key: "Enter" });
  expect(verifyPasswordResetCode).toHaveBeenCalledTimes(2);
  fireEvent.keyPress(password, { key: "Enter" });
  await waitFor(() =>
    expect(container.querySelector(".fa-check")).not.toBeNull(),
  );
  expect(confirmPasswordReset).toHaveBeenCalledWith(auth, "code", "Strong1!");
  expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
    auth,
    "user@example.test",
    "Strong1!",
  );
  expect(container.querySelector(".preloader .text")?.textContent).toBe(
    "Your password has been changed",
  );
});

it("retains reset-code failures without showing the form again", async () => {
  vi.mocked(verifyPasswordResetCode).mockRejectedValue(new Error("expired"));
  const { container } = mount("mode=resetPassword&oobCode=code");
  fireEvent.click(container.querySelector(".button") as HTMLElement);
  await waitFor(() =>
    expect(container.querySelector(".fa-times")).not.toBeNull(),
  );
  expect(container.querySelector(".resetPassword")?.className).toContain(
    "hidden",
  );
  expect(confirmPasswordReset).not.toHaveBeenCalled();
});

it("preserves the recovery caller's missing argument and raw SDK error", async () => {
  vi.mocked(checkActionCode).mockRejectedValue(
    new Error("invalid recovery code"),
  );
  const { container } = mount("mode=recoverEmail&oobCode=code");
  await waitFor(() =>
    expect(container.querySelector(".fa-times")).not.toBeNull(),
  );
  expect(checkActionCode).toHaveBeenCalledWith(auth, undefined);
  expect(container.querySelector(".preloader .text")?.textContent).toBe(
    "invalid recovery code",
  );
  expect(container.querySelector("#logo span")?.textContent).toBe(
    "Email Handler",
  );
});
