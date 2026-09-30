import { setAnalyticsMarkupEnabled } from "../states/third-party";
import {
  Analytics as AnalyticsType,
  logEvent,
  setAnalyticsCollectionEnabled,
} from "firebase/analytics";
import { getAnalytics } from "../firebase";
import { createErrorMessage } from "../utils/error";

let analytics: AnalyticsType;

export async function log(
  eventName: string,
  params?: Record<string, string>,
): Promise<void> {
  try {
    logEvent(analytics, eventName, params);
  } catch (e) {
    console.log("Analytics unavailable");
  }
}

export function activateAnalytics(): void {
  if (analytics !== undefined) {
    console.warn("Analytics already activated");
    return;
  }
  console.log("Activating Analytics");
  try {
    analytics = getAnalytics();
    setAnalyticsCollectionEnabled(analytics, true);
    setAnalyticsMarkupEnabled(true);
  } catch (e) {
    console.error(createErrorMessage(e, "Failed to activate analytics"));
  }
}
