import type { TextField } from "./text-field";

import { useTheme } from "../theme/theme";
import { StyledLine } from "./styled";

/** A text field line with a block cursor when focused. */
export function TextInput(props: {
  field: TextField;
  label?: string;
  placeholder?: string;
  focused?: boolean;
  error?: boolean;
}) {
  const theme = useTheme();
  const colors = (): ReturnType<typeof theme>["colors"] => theme().colors;
  const chunks = () => {
    const characters = Array.from(props.field.value());
    const at = props.field.cursor();
    const focused = props.focused !== false;
    const label =
      props.label === undefined
        ? []
        : [{ text: `${props.label} `, fg: colors().sub }];
    if (characters.length === 0 && props.placeholder !== undefined) {
      return [
        ...label,
        ...(focused
          ? [{ text: " ", bg: colors().caret, fg: colors().bg }]
          : []),
        { text: props.placeholder, fg: colors().sub },
      ];
    }
    const fg = props.error === true ? colors().error : colors().text;
    return [
      ...label,
      { text: characters.slice(0, at).join(""), fg },
      ...(focused
        ? [
            {
              text: characters[at] ?? " ",
              bg: colors().caret,
              fg: colors().bg,
            },
            { text: characters.slice(at + 1).join(""), fg },
          ]
        : [{ text: characters.slice(at).join(""), fg }]),
    ];
  };
  return <StyledLine chunks={chunks()} />;
}
