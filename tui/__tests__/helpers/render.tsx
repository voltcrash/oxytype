import type { JSX } from "solid-js";

import { testRender } from "@opentui/solid";
import { afterEach } from "bun:test";

type Setup = Awaited<ReturnType<typeof testRender>>;

const active: Setup[] = [];

afterEach(() => {
  for (const setup of active.splice(0)) setup.renderer.destroy();
});

export async function renderTui(
  node: () => JSX.Element,
  size = { width: 100, height: 20 },
): Promise<
  Setup & { frame: () => Promise<string>; escape: () => Promise<void> }
> {
  const setup = await testRender(node, size);
  active.push(setup);
  return {
    ...setup,
    frame: async () => {
      await setup.renderOnce();
      return setup.captureCharFrame();
    },
    // A lone ESC byte resolves after the escape-sequence timeout.
    escape: async () => {
      setup.mockInput.pressEscape();
      await Bun.sleep(30);
    },
  };
}
