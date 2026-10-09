import { KeyEvent } from "@opentui/core";
import { afterEach } from "bun:test";
import { join } from "node:path";
import { createRoot } from "solid-js";

import { createAssetSource } from "../../src/assets/source";
import { openConfigStore } from "../../src/config/store";
import { createTestSources } from "../../src/test/sources";
import {
  createTypingTest,
  type TypingTestOptions,
  type TypingTest,
} from "../../src/test/typing-test";
import type { ConfigStore } from "../../src/config/store";
import { tempDir } from "./temp-dir";

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

export function key(name: string, options: Partial<KeyEvent> = {}): KeyEvent {
  return new KeyEvent({
    name,
    sequence: name.length === 1 ? name : "",
    raw: "",
    ctrl: false,
    meta: false,
    shift: false,
    option: false,
    number: false,
    eventType: "press",
    source: "raw",
    ...options,
  });
}

export async function typingTest(
  options: Partial<TypingTestOptions> = {},
): Promise<{ test: TypingTest; store: ConfigStore }> {
  const store =
    options.store ??
    (await openConfigStore(join(await tempDir(), "config.json")));
  await store.flush();
  const test = createRoot((dispose) => {
    disposers.push(dispose);
    return createTypingTest({
      store,
      sources: createTestSources(createAssetSource()),
      schedule: false,
      ...options,
    });
  });
  await test.ready;
  return { test, store };
}
