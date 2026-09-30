import { JSXElement } from "solid-js";

import { getIsScreenshotting } from "../../../../states/core";
import { resultState } from "../../../../states/result";
import { cn } from "../../../../utils/cn";

export function ResultLoginTip(): JSXElement {
  return (
    <div
      class={cn(
        "loginTip col-[1/3] text-center text-sub",
        (!resultState.loginTip || getIsScreenshotting()) && "hidden",
      )}
    >
      <a href="/login" router-link>
        Sign in
      </a>{" "}
      to save your result
    </div>
  );
}
