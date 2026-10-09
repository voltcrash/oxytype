import type { RGBA } from "@opentui/core";

import { For } from "solid-js";

/** Three-row half-block glyphs: six pixels tall, readable across the room. */
const glyphs: Record<string, [string, string, string]> = {
  "0": ["█▀█", "█ █", "▀▀▀"],
  "1": ["▀█ ", " █ ", "▀▀▀"],
  "2": ["▀▀█", "█▀▀", "▀▀▀"],
  "3": ["▀▀█", " ▀█", "▀▀▀"],
  "4": ["█ █", "▀▀█", "  ▀"],
  "5": ["█▀▀", "▀▀█", "▀▀▀"],
  "6": ["█▀▀", "█▀█", "▀▀▀"],
  "7": ["▀▀█", "  █", "  ▀"],
  "8": ["█▀█", "█▀█", "▀▀▀"],
  "9": ["█▀█", "▀▀█", "▀▀▀"],
  ".": [" ", " ", "▀"],
  "%": ["▀ ▄▀", " ▄▀ ", "▄▀ ▄"],
  "-": ["   ", "▀▀▀", "   "],
  " ": [" ", " ", " "],
};

/** Rows of big text; unknown characters sit on the middle row. */
export function bigTextLines(text: string): [string, string, string] {
  const rows: [string[], string[], string[]] = [[], [], []];
  for (const char of text) {
    const glyph = glyphs[char] ?? [" ", char, " "];
    rows[0].push(glyph[0]);
    rows[1].push(glyph[1]);
    rows[2].push(glyph[2]);
  }
  return [rows[0].join(" "), rows[1].join(" "), rows[2].join(" ")];
}

export function BigText(props: { text: string; fg: RGBA }) {
  return (
    <box flexDirection="column" flexShrink={0}>
      <For each={bigTextLines(props.text)}>
        {(line) => (
          <text fg={props.fg} wrapMode="none">
            {line}
          </text>
        )}
      </For>
    </box>
  );
}
