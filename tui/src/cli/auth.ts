import { createEffect, createRoot } from "solid-js";

import type { AuthStore } from "../auth/store";

export async function runAuthCommand(
  command: "login" | "logout",
  auth: AuthStore,
  print: (line: string) => void = console.log,
): Promise<number> {
  let dispose = (): void => undefined;
  let interrupted = false;
  const interrupt = (): void => {
    interrupted = true;
    auth.cancel();
  };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    createRoot((cleanup) => {
      dispose = cleanup;
      createEffect(() => {
        const device = auth.device();
        if (device === undefined) return;
        print(
          `Open ${device.verification_uri_complete ?? device.verification_uri}`,
        );
        print(`Code: ${device.user_code}`);
        print("Approve this code in your browser. Ctrl+C cancels.");
      });
    });
    if (command === "login") await auth.login();
    else await auth.logout();
    if (interrupted) return 130;
    const success =
      command === "login"
        ? auth.state() === "authenticated"
        : auth.state() === "guest";
    print(
      success
        ? command === "login"
          ? "Logged in"
          : "Logged out"
        : (auth.notice() ?? `${command} failed`),
    );
    return success ? 0 : 1;
  } finally {
    dispose();
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  }
}
