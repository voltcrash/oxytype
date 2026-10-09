import { createSignal } from "solid-js";
import { useNotifications } from "../notifications";
import { responseError, type ApiResponse } from "../api/client";

export function requireSuccess(response: ApiResponse): void {
  if (response.status !== 200) throw responseError(response);
}

export function createAction(): {
  busy: () => boolean;
  run: (action: () => Promise<void>) => Promise<void>;
} {
  const notifications = useNotifications();
  const [busy, setBusy] = createSignal(false);
  return {
    busy,
    run: async (action) => {
      if (busy()) return;
      setBusy(true);
      try {
        await action();
      } catch (failure) {
        notifications.notify(
          failure instanceof Error ? failure.message : "Action failed",
          "error",
        );
      } finally {
        setBusy(false);
      }
    },
  };
}
