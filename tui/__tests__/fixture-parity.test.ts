import type { Config } from "@oxytype/schemas/configs";
import { getAccuracy, getChars } from "@oxytype/typing-core/events/stats";
import type { EventLog } from "@oxytype/typing-core/events/types";
import { calculateWpm } from "@oxytype/typing-core/stats-math";
import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import type { LocalResult } from "../src/test/typing-test";
import { typingTest } from "./helpers/typing-test";

test("live values and result metrics match the recorded web time-15 fixture", async () => {
  const fixture = JSON.parse(
    await readFile(
      new URL(
        "../../packages/typing-core/__fixtures__/keystrokes/time-15.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as {
    config: Partial<Config>;
    eventLog: EventLog;
    completedEvent: LocalResult;
  };
  let clock = 0;
  const start = fixture.eventLog.events.find(
    (event) => event.type === "timer" && event.data.event === "start",
  );
  const date =
    start?.type === "timer" && start.data.event === "start"
      ? start.data.date
      : 0;
  const { test: typing, store } = await typingTest({
    words: fixture.eventLog.context.targetWords,
    now: () => clock,
    dateNow: () => date + clock,
  });
  store.apply(fixture.config);
  await typing.restart();
  let ticks = 0;
  for (const event of fixture.eventLog.events) {
    clock = event.testMs;
    if (event.type === "input") {
      if (event.data.inputType === "insertText") {
        await typing.insert(event.data.data, clock);
      } else if (
        event.data.inputType === "deleteContentBackward" ||
        event.data.inputType === "deleteWordBackward"
      ) {
        typing.session().delete(event.data.inputType, clock);
      }
    } else if (event.type === "timer") {
      if (event.data.event === "start") typing.session().start(clock);
      if (event.data.event === "step") {
        typing.advance(clock);
        const throughTick = {
          ...fixture.eventLog,
          events: fixture.eventLog.events.filter(
            (item) => item.testMs <= clock,
          ),
        };
        const chars = getChars(throughTick, true);
        expect(typing.stats().wpm).toBe(
          Math.round(calculateWpm(chars.correctWord, clock / 1000)),
        );
        expect(typing.stats().raw).toBe(
          Math.round(
            calculateWpm(
              chars.allCorrect + chars.extra + chars.incorrect,
              clock / 1000,
            ),
          ),
        );
        expect(typing.stats().acc).toBe(getAccuracy(throughTick).percentage);
        ticks++;
      }
    } else {
      typing.session().record(event.type, clock, event.data);
    }
  }
  expect(ticks).toBe(15);
  expect(typing.status()).toBe("finished");
  for (const field of [
    "wpm",
    "rawWpm",
    "acc",
    "charStats",
    "testDuration",
    "consistency",
    "chartData",
  ] as const) {
    expect(typing.result()?.result[field]).toEqual(
      fixture.completedEvent[field],
    );
  }
  await store.flush();
});
