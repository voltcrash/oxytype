import { generateHydrationScript, renderToString } from "solid-js/web";

import { StartupScreen } from "./components/core/StartupScreen";
import { StandaloneNotFound } from "./components/standalone/NotFound";
import { OAuthCallback } from "./components/standalone/OAuthCallback";
import { PrivacyPolicy } from "./components/standalone/PrivacyPolicy";

export function renderStandalone(path: string): {
  html: string;
  hydrationScript: string;
} {
  return {
    hydrationScript: path === "/index.html" ? "" : generateHydrationScript(),
    html: renderToString(() => {
      if (path === "/index.html") return <StartupScreen />;
      if (path === "/oauth-callback.html") {
        return <OAuthCallback />;
      }
      if (path === "/privacy-policy.html") return <PrivacyPolicy />;
      return <StandaloneNotFound />;
    }),
  };
}
