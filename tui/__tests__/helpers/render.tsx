import type { JSX } from "solid-js";

import { testRender } from "@opentui/solid";
import { getDefaultConfig } from "@oxytype/typing-core/config/default-config";

import { toTerminalTheme } from "../../src/theme/theme";

type Setup = Awaited<ReturnType<typeof testRender>>;

const active: Setup[] = [];
const dim = toTerminalTheme(getDefaultConfig()).colors.sub;

export function cleanupRenderers(): void {
  for (const setup of active.splice(0)) setup.renderer.destroy();
}

export async function renderTui(
  node: () => JSX.Element,
  // The narrowest common terminal width.
  size = { width: 80, height: 20 },
): Promise<
  Setup & {
    frame: () => Promise<string>;
    escape: () => Promise<void>;
    active: (label: string) => Promise<boolean>;
  }
> {
  const setup = await testRender(node, size);
  active.push(setup);
  return {
    ...setup,
    frame: async () => {
      await setup.renderOnce();
      return setup.captureCharFrame();
    },
    // Active tabs, pills and choices sit on a raised background in a
    // brighter colour than the default theme's dim text.
    active: async (label: string) => {
      await setup.renderOnce();
      const frame = setup.captureSpans();
      const canvas = frame.lines[0]?.spans[0]?.bg;
      return frame.lines.some((line) =>
        line.spans.some(
          (span) =>
            span.text.trim() === label &&
            !span.bg.equals(canvas) &&
            !span.fg.equals(dim),
        ),
      );
    },
    // A lone ESC byte resolves after the escape-sequence timeout.
    escape: async () => {
      setup.mockInput.pressEscape();
      await Bun.sleep(30);
    },
  };
}
