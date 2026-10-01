import { showNoticeNotification } from "../states/notifications";
import { qs } from "../utils/dom";

export async function show(): Promise<void> {
  showNoticeNotification("Video ads are unavailable in Oxytype.");
}

export function egVideoListener(_options: Record<string, string>): void {
  return;
}

qs(".pageTest #watchVideoAdButton")?.on("click", () => {
  void show();
});
