import { JSXElement, Match, Switch } from "solid-js";

import { PrivacyPolicy } from "./PrivacyPolicy";

export function LegalPage(props: { path: string }): JSXElement {
  return (
    <Switch>
      <Match when={props.path === "/privacy-policy.html"}>
        <PrivacyPolicy />
      </Match>
    </Switch>
  );
}
