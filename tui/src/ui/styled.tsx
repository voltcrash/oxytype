import type { RGBA, TextRenderable } from "@opentui/core";

import { StyledText, TextAttributes } from "@opentui/core";
import { createEffect } from "solid-js";

export type Chunk = {
  text: string;
  fg?: RGBA;
  bg?: RGBA;
  bold?: boolean;
  underline?: boolean;
};

/** One line of differently styled runs. */
export function StyledLine(props: {
  chunks: Chunk[];
  wrap?: boolean;
  flexGrow?: number;
}) {
  let line!: TextRenderable;
  // OpenTUI Solid 0.5 stringifies JSX content, so styled runs use a ref.
  createEffect(() => {
    line.content = new StyledText(
      props.chunks.map((chunk) => ({
        __isChunk: true as const,
        text: chunk.text,
        fg: chunk.fg,
        bg: chunk.bg,
        attributes:
          (chunk.bold === true ? TextAttributes.BOLD : 0) |
          (chunk.underline === true ? TextAttributes.UNDERLINE : 0),
      })),
    );
  });
  return (
    <text
      ref={(node) => {
        line = node;
      }}
      wrapMode={props.wrap === true ? "word" : "none"}
      flexShrink={0}
      flexGrow={props.flexGrow}
    />
  );
}
