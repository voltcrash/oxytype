import type { JSX } from "solid-js";

import { testRender } from "@opentui/solid";

type Setup = Awaited<ReturnType<typeof testRender>>;

const active: Setup[] = [];

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
    // Pills, tabs and selections mark the active label with a raised background.
    active: async (label: string) => {
      await setup.renderOnce();
      const frame = setup.captureSpans();
      const canvas = frame.lines[0]?.spans[0]?.bg;
      return frame.lines.some((line) =>
        line.spans.some(
          (span) => span.text.trim() === label && !span.bg.equals(canvas),
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
