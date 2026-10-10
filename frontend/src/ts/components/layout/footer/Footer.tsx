import { JSXElement } from "solid-js";

import { getIsScreenshotting } from "../../../states/core";
import { getFocus } from "../../../states/test";
import { cn } from "../../../utils/cn";
import { Keytips } from "./Keytips";
import { ThemeIndicator } from "./ThemeIndicator";
import { VersionButton } from "./VersionButton";

export function Footer(): JSXElement {
  return (
    <footer
      class={cn("relative text-sm text-sub sm:text-xs", getFocus() && "focus", {
        "opacity-0": getIsScreenshotting(),
      })}
    >
      <Keytips />

      <div
        class={cn(
          "-m-2 flex flex-col items-end justify-end text-right transition-opacity [&>*]:min-h-9 lg:flex-row sm:[&>*]:min-h-0",
          getFocus() && "opacity-0",
        )}
      >
        <ThemeIndicator />
        <VersionButton />
      </div>
    </footer>
  );
}
