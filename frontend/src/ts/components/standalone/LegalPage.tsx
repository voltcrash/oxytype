import { JSXElement, Match, Switch } from "solid-js";

import { PrivacyPolicy } from "./PrivacyPolicy";
import { SecurityPolicy } from "./SecurityPolicy";

export function LegalPage(props: { path: string }): JSXElement {
  return (
    <Switch>
      <Match when={props.path === "/privacy-policy.html"}>
        <PrivacyPolicy />
      </Match>
      <Match when={props.path === "/security-policy.html"}>
        <SecurityPolicy />
      </Match>
    </Switch>
  );
}
