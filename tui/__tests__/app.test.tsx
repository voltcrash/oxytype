import { testRender } from "@opentui/solid";
import { afterEach, expect, test } from "bun:test";

import { App } from "../src/app";

let setup: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  setup?.renderer.destroy();
  setup = undefined;
});

test("renders the hello screen", async () => {
  setup = await testRender(() => <App />, { width: 60, height: 10 });
  await setup.renderOnce();
  const frame = setup.captureCharFrame();
  expect(frame).toContain("oxytype");
  expect(frame).toContain("ctrl+c to quit");
});
