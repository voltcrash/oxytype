import { JSXElement } from "solid-js";

import { cn } from "../../utils/cn";
import { Fa } from "./Fa";

export function UserAvatar(props: {
  class?: string;
  fallbackIcon?: "user-circle" | "user";
}): JSXElement {
  return (
    <div
      class={cn(
        "grid aspect-square h-[1.25em] w-[1.25em] place-items-center transition-colors duration-125",
        props.class,
      )}
    >
      {/* the bare user glyph fills its box, so inset it like other icons */}
      <Fa
        icon={props.fallbackIcon === "user" ? "fa-user" : "fa-circle-user"}
        class={
          props.fallbackIcon === "user" ? "text-[0.85em]" : "text-[1.25em]"
        }
      />
    </div>
  );
}
