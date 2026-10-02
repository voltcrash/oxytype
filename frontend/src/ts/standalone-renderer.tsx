import { generateHydrationScript, renderToString } from "solid-js/web";

import { LegalPage } from "./components/standalone/LegalPage";
import { StandaloneNotFound } from "./components/standalone/NotFound";
import { OAuthCallback } from "./components/standalone/OAuthCallback";

export function renderStandalone(path: string): {
  html: string;
  hydrationScript: string;
} {
  return {
    hydrationScript: generateHydrationScript(),
    html: renderToString(() => {
      if (path === "/oauth-callback.html") {
        return <OAuthCallback />;
      }
      if (path === "/404.html") return <StandaloneNotFound />;
      return <LegalPage path={path} />;
    }),
  };
}
