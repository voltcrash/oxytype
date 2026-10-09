import { readFile } from "node:fs/promises";
import {
  CompletedEventSchema,
  type CompletedEvent,
} from "@oxytype/schemas/results";
import type { EventLog } from "@oxytype/typing-core/events/types";

import type { UploadIdentity } from "../../src/auth/identity";
import type { FinishedTest } from "../../src/test/typing-test";

export const identity: UploadIdentity = {
  uid: "test-user",
  apiUrl: "https://example.test/api",
  online: true,
};
export const uploadResponse = {
  message: "saved",
  data: {
    insertedId: "saved123",
    isPb: true,
    tagPbs: [],
    xp: 1,
    dailyXpBonus: false,
    xpBreakdown: {},
    streak: 1,
  },
};
export async function finishedTest(
  owner: UploadIdentity = identity,
): Promise<FinishedTest> {
  const fixture = JSON.parse(
    await readFile(
      new URL(
        "../../../backend/__tests__/__testData__/terminal-words-10.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as {
    result: CompletedEvent;
    eventLog: EventLog;
  };
  const {
    uid: _uid,
    hash: _hash,
    ...result
  } = CompletedEventSchema.parse(fixture.result);
  return {
    result: { ...result, timestamp: Date.now() - 20_000 },
    eventLog: fixture.eventLog,
    rawHistory: [],
    owner,
  };
}
