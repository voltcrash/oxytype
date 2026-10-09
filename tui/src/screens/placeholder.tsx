import type { ParentProps } from "solid-js";

import { useTheme } from "../theme/theme";

export function Placeholder(props: ParentProps<{ title: string }>) {
  const theme = useTheme();
  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().colors.main}>{props.title}</text>
      {props.children}
    </box>
  );
}
