import { hydrate } from "solid-js/web";

import { PrivacyPolicy } from "./components/standalone/PrivacyPolicy";

const element = document.getElementById("app");
if (element !== null) hydrate(() => <PrivacyPolicy />, element);
