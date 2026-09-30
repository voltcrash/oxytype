import { hydrate } from "solid-js/web";

import { LegalPage } from "./components/standalone/LegalPage";

const element = document.getElementById("app");
if (element !== null) {
  hydrate(() => <LegalPage path={window.location.pathname} />, element);
}
