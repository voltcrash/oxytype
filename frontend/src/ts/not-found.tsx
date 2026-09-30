import { render } from "solid-js/web";

import { StandaloneNotFound } from "./components/standalone/NotFound";

const element = document.getElementById("app");
if (element !== null) render(() => <StandaloneNotFound />, element);
