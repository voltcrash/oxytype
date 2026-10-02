import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

import { authClient } from "../../../src/ts/auth-client";
import { EmailHandler } from "../../../src/ts/components/standalone/EmailHandler";

vi.mock("../../../src/ts/auth-client", () => ({
  authClient: { resetPassword: vi.fn(), verifyEmail: vi.fn() },
}));
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
  return render(() => <EmailHandler authClient={authClient} />);
}
it.each([
  ["", "Mode parameter not found"],
  ["mode=resetPassword", "Action code parameter not found"],
  ["mode=unknown&token=code", "Invalid mode"],
  ["mode=resetPassword&error=INVALID_TOKEN", "INVALID_TOKEN"],
])("shows action errors for %s", (query, message) => {
  const { container } = mount(query);
  expect(container.querySelector(".preloader .text")).toHaveTextContent(
    message,
  );
  expect(container.querySelector(".fa-times")).not.toBeNull();
});
it("shows success after server-side email verification", () => {
  const { container } = mount("mode=verifyEmail");
  expect(container.querySelector(".preloader .text")).toHaveTextContent(
    "Your email address has been verified",
  );
  expect(authClient.verifyEmail).not.toHaveBeenCalled();
});
it("verifies a decoded token when opening a direct verification link", async () => {
  vi.mocked(authClient.verifyEmail).mockResolvedValue({
    data: { status: true, user: null },
    error: null,
  });
  const { container } = mount("mode=verifyEmail&token=a%2Bb+code");
  await waitFor(() =>
    expect(container.querySelector(".fa-check")).not.toBeNull(),
  );
  expect(authClient.verifyEmail).toHaveBeenCalledWith({
    query: { token: "a+b code" },
  });
});
it("validates and submits password reset tokens without signing in", async () => {
  vi.mocked(authClient.resetPassword).mockResolvedValue({
    data: { status: true },
    error: null,
  });
  const { container } = mount("mode=resetPassword&token=code");
  const password = container.querySelector(".pwd") as HTMLInputElement;
  const confirmation = container.querySelector(
    ".pwd-confirm",
  ) as HTMLInputElement;
  await waitFor(() => expect(document.activeElement).toBe(password));
  password.value = "Strong1!";
  confirmation.value = "different";
  fireEvent.click(container.querySelector(".button") as HTMLElement);
  await waitFor(() =>
    expect(window.alert).toHaveBeenCalledWith("Passwords do not match"),
  );
  expect(authClient.resetPassword).not.toHaveBeenCalled();
  password.value = confirmation.value = "weak";
  fireEvent.click(container.querySelector(".button") as HTMLElement);
  await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(2));
  expect(authClient.resetPassword).not.toHaveBeenCalled();
  password.value = confirmation.value = "Strong1!";
  fireEvent.keyPress(password, { key: "Enter" });
  await waitFor(() =>
    expect(container.querySelector(".fa-check")).not.toBeNull(),
  );
  expect(authClient.resetPassword).toHaveBeenCalledWith({
    token: "code",
    newPassword: "Strong1!",
  });
});
it("shows expired or reused reset-token errors", async () => {
  vi.mocked(authClient.resetPassword).mockResolvedValue({
    data: null,
    error: { message: "Invalid token", status: 400, statusText: "Bad Request" },
  });
  const { container } = mount("mode=resetPassword&token=expired");
  (container.querySelector(".pwd") as HTMLInputElement).value = "Strong1!";
  (container.querySelector(".pwd-confirm") as HTMLInputElement).value =
    "Strong1!";
  fireEvent.click(container.querySelector(".button") as HTMLElement);
  await waitFor(() =>
    expect(container.querySelector(".preloader .text")).toHaveTextContent(
      "Invalid token",
    ),
  );
});
it("returns OAuth results only to the opener at the current origin", () => {
  const postMessage = vi.fn();
  vi.stubGlobal("opener", { postMessage });
  vi.spyOn(window, "close").mockImplementation(() => undefined);
  mount("mode=oauthCallback&requestId=nonce&error=access_denied");
  expect(postMessage).toHaveBeenCalledWith(
    { type: "oxytype-auth", requestId: "nonce", error: "access_denied" },
    window.location.origin,
  );
  expect(window.close).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
