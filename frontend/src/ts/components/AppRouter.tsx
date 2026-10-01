import { Router } from "@solidjs/router";
import { JSXElement } from "solid-js";

import { appRoutes } from "../navigation/routes";
import { App } from "./App";
import { AppElements } from "./core/AppEffects";
import { NavigationRuntime } from "./core/NavigationRuntime";

export function AppRouter(props: AppElements): JSXElement {
  return (
    <Router
      explicitLinks
      preload={false}
      root={(route) => (
        <>
          <NavigationRuntime />
          {route.children}
          <App {...props} />
        </>
      )}
    >
      {appRoutes}
    </Router>
  );
}
