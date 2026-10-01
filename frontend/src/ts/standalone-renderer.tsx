import { generateHydrationScript, renderToString } from "solid-js/web";

import { EmailHandler } from "./components/standalone/EmailHandler";
import { LegalPage } from "./components/standalone/LegalPage";
import { StandaloneNotFound } from "./components/standalone/NotFound";

export function renderStandalone(path: string): {
  html: string;
  hydrationScript: string;
} {
  return {
    hydrationScript: generateHydrationScript(),
    html: renderToString(() => {
      if (path === "/email-handler.html") {
        return (
          <EmailHandler
            initializeAuth={() => {
              throw new Error("Auth initializes in the browser");
            }}
          />
        );
      }
      if (path === "/404.html") return <StandaloneNotFound />;
      return <LegalPage path={path} />;
    }),
  };
}
