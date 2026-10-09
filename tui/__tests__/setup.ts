import { afterEach } from "bun:test";

import { cleanupRenderers } from "./helpers/render";
import { cleanupTempDirs } from "./helpers/temp-dir";
import { cleanupTypingTests } from "./helpers/typing-test";

// Preloaded hooks apply to every file, even when helper imports are cached.
afterEach(async () => {
  cleanupRenderers();
  cleanupTypingTests();
  await cleanupTempDirs();
});
