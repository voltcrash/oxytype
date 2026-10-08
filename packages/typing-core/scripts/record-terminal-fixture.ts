/** PTY smoke recorder. This is a transport harness, not the Stage D TUI. */
import { readFileSync, writeFileSync } from "node:fs";
import { createTestSession, type SessionConfig } from "../src/session";
import { hashResult } from "../src/result-hash";

const output = process.argv[2];
if (output === undefined || output === "" || !process.stdin.isTTY) {
  throw new Error(
    "Usage: tsx record-terminal-fixture.ts <output.json> (TTY required)",
  );
}
const text = "the quick brown fox jumps over the lazy dog again";
const baseline = JSON.parse(
  readFileSync(
    new URL("../__fixtures__/keystrokes/words-10-clean.json", import.meta.url),
    "utf8",
  ),
) as { config: SessionConfig };
const config: SessionConfig = {
  ...baseline.config,
  mode: "words",
  words: 10,
  quickEnd: true,
  stopOnError: "off",
  deleteOnError: "off",
  freedomMode: false,
  confidenceMode: "off",
  minWpm: "off",
  minAcc: "off",
};
const session = createTestSession(config, { words: text.split(" ") });
process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
process.stdout.write(`${text}\nREADY\n`);
let chain = Promise.resolve();
process.stdin.on("data", (value: string) => {
  const now = performance.now();
  chain = chain.then(async () => {
    for (const char of value) {
      if (char === "\u0003") {
        process.stdin.setRawMode(false);
        process.exit(1);
      }
      session.record("keydown", now, { code: "NoCode" });
      if (char === "\u007f") session.delete("deleteContentBackward", now);
      else await session.insert(char, now);
    }
    return undefined;
  });
});
session.on("finish", ({ eventLog }) => {
  process.stdin.pause();
  process.stdin.setRawMode(false);
  void (async () => {
    const result = session.complete(eventLog, {
      client: "tui",
      config,
      currentQuote: null,
      customText: undefined,
      tags: [],
      bailedOut: false,
      restartCount: 0,
      incompleteTests: [],
      incompleteSeconds: 0,
      timestamp: Date.now(),
    });
    const payload = { ...result, uid: "terminal-fixture" };
    writeFileSync(
      output,
      `${JSON.stringify(
        {
          source: "automated PTY input; not human calibration",
          text,
          eventLog,
          result: { ...payload, hash: await hashResult(payload) },
        },
        null,
        2,
      )}\n`,
    );
    process.stdout.write("RECORDED\n");
  })();
});
