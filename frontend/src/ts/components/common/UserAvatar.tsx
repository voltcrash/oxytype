import { JSXElement } from "solid-js";

import { cn } from "../../utils/cn";
import { Fa } from "./Fa";

export function UserAvatar(props: {
  class?: string;
  fallbackIcon?: "user-circle" | "user";
}): JSXElement {
  return (
    <Fa
      icon={props.fallbackIcon === "user" ? "fa-user" : "fa-circle-user"}
      class={cn("text-[1.25em] transition-colors duration-125", props.class)}
    />
  );
}
