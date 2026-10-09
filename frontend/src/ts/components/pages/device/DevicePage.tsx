import { useSearchParams } from "@solidjs/router";
import { JSXElement, Show } from "solid-js";

import { isAuthenticated } from "../../../states/core";
import { Page } from "../../common/Page";
import { Login } from "../login/Login";
import { DeviceApproval } from "./DeviceApproval";

export function DevicePage(): JSXElement {
  const [params] = useSearchParams();
  const code = () =>
    typeof params["user_code"] === "string" ? params["user_code"] : undefined;
  return (
    <Page id="device">
      <div class="grid h-full place-items-center gap-4">
        <Show
          when={isAuthenticated()}
          fallback={
            <div class="grid gap-4">
              <p class="text-sub">
                Sign in to authorize your terminal. Your device code will be
                kept.
              </p>
              <Login />
            </div>
          }
        >
          <DeviceApproval initialCode={code()} />
        </Show>
      </div>
    </Page>
  );
}
