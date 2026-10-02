import { hydrate } from "solid-js/web";

import { OAuthCallback } from "./components/standalone/OAuthCallback";

const element = document.getElementById("app");
if (element !== null) {
  hydrate(() => <OAuthCallback />, element);
}
