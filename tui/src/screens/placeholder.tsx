import type { ParentProps } from "solid-js";

export function Placeholder(props: ParentProps<{ title: string }>) {
  return (
    <box flexDirection="column" gap={1}>
      <text>{props.title}</text>
      {props.children}
    </box>
  );
}
