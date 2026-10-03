import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

import { signInWithProvider } from "../../../../src/ts/auth";
import { Login } from "../../../../src/ts/components/pages/login/Login";
import { enableLoginPageInputs } from "../../../../src/ts/states/login";
import { showErrorNotification } from "../../../../src/ts/states/notifications";

const config = vi.hoisted(() => ({
  authProviders: ["google", "github"] as ("google" | "github")[],
}));
vi.mock("virtual:env-config", () => ({ envConfig: config }));

vi.mock("../../../../src/ts/auth", () => ({
  signInWithProvider: vi.fn(),
  getAuthMethodDisplay: (method: string) =>
    method === "google" ? "Google" : "GitHub",
}));
vi.mock("../../../../src/ts/states/notifications", () => ({
  showErrorNotification: vi.fn(),
}));

beforeEach(() => {
  config.authProviders = ["google", "github"];
  enableLoginPageInputs();
  vi.mocked(signInWithProvider)
    .mockReset()
    .mockResolvedValue({ success: true });
  vi.mocked(showErrorNotification).mockReset();
});
afterEach(() => {
  cleanup();
  config.authProviders = ["google", "github"];
});

it("offers only Google/GitHub sign-in and remember me", () => {
  const { getAllByRole, queryByRole } = render(() => <Login />);
  expect(getAllByRole("button").map((button) => button.textContent)).toEqual([
    "sign in with Google",
    "sign in with GitHub",
  ]);
  expect(queryByRole("textbox")).toBeNull();
  expect(queryByRole("checkbox", { name: "remember me" })).toBeChecked();
});
it("omits Google sign-in when production only enables GitHub", () => {
  config.authProviders = ["github"];
  const { getByRole, queryByRole } = render(() => <Login />);
  expect(queryByRole("button", { name: "sign in with Google" })).toBeNull();
  expect(getByRole("button", { name: "sign in with GitHub" })).toBeEnabled();
});
it.each([
  ["google", "Google"],
  ["github", "GitHub"],
] as const)(
  "signs in with %s and preserves remember me",
  async (provider, label) => {
    const { getByRole } = render(() => <Login />);
    fireEvent.click(getByRole("button", { name: `sign in with ${label}` }));
    await waitFor(() =>
      expect(signInWithProvider).toHaveBeenCalledWith(provider, {
        rememberMe: true,
      }),
    );
    await waitFor(() =>
      expect(
        getByRole("button", { name: `sign in with ${label}` }),
      ).not.toBeDisabled(),
    );
    fireEvent.click(getByRole("checkbox", { name: "remember me" }));
    fireEvent.click(getByRole("button", { name: `sign in with ${label}` }));
    await waitFor(() =>
      expect(signInWithProvider).toHaveBeenLastCalledWith(provider, {
        rememberMe: false,
      }),
    );
  },
);
it("disables controls while OAuth is pending and reenables them after failure", async () => {
  let finish!: (result: { success: false; message: string }) => void;
  vi.mocked(signInWithProvider).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const { getByRole, getAllByRole } = render(() => <Login />);
  fireEvent.click(getByRole("button", { name: "sign in with Google" }));
  for (const button of getAllByRole("button")) {
    expect(button).toBeDisabled();
  }
  expect(getByRole("checkbox")).toBeDisabled();
  finish({ success: false, message: "Sign-in cancelled" });
  await waitFor(() =>
    expect(showErrorNotification).toHaveBeenCalledWith(
      "Failed to sign in with Google: Sign-in cancelled",
    ),
  );
  for (const button of getAllByRole("button")) {
    expect(button).not.toBeDisabled();
  }
  expect(getByRole("checkbox")).not.toBeDisabled();
});
