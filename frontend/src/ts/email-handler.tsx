import { hydrate } from "solid-js/web";

import { authClient } from "./auth-client";
import { EmailHandler } from "./components/standalone/EmailHandler";

const element = document.getElementById("app");
if (element !== null) {
  hydrate(() => <EmailHandler authClient={authClient} />, element);
}
