import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  CompletedEventSchema,
  type CompletedEvent,
} from "@oxytype/schemas/results";
import { hashResult } from "@oxytype/typing-core/result-hash";

import { createApi } from "../src/api/client";
import { networkSettingsSchema } from "../src/api/settings";
import { createHistoryStore } from "../src/results/history";
import { createResultUploader, uploadPayload } from "../src/results/upload";
import {
  createUploadQueue,
  maxUploadAge,
  openUploadQueue,
} from "../src/results/upload-queue";
import { writeJson } from "../src/storage/json";
import { finishedTest, identity, uploadResponse } from "./helpers/finished";
import { tempDir } from "./helpers/temp-dir";

const settings = networkSettingsSchema.parse({ apiUrl: identity.apiUrl });
describe("result uploads and offline queue", () => {
  test("hashes the actual TUI identity and online payload, reports a PB, and clears the durable queue", async () => {
    const requests: CompletedEvent[] = [];
    const api = createApi({
      settings,
      token: () => "session",
      fetch: async (_input, init) => {
        const body = JSON.parse(
          typeof init?.body === "string" ? init.body : "",
        ) as { result: unknown };
        requests.push(CompletedEventSchema.parse(body.result));
        return Response.json(uploadResponse);
      },
    });
    const queue = await openUploadQueue(join(await tempDir(), "uploads.json"));
    const uploader = createResultUploader({
      api,
      queue,
      identity: () => identity,
    });
    const finished = await finishedTest();
    await uploader.accept(finished);
    expect(uploader.last()).toMatchObject({ state: "uploaded", isPb: true });
    expect(requests[0]).toMatchObject({
      uid: identity.uid,
      client: "tui",
      offline: false,
    });
    const { hash, ...payload } = requests[0] as CompletedEvent;
    expect(hash).toBe(await hashResult(payload));
    expect(queue.entries()).toHaveLength(0);
  });

  test("reopens failed uploads and sends offline history/stats with a fresh valid hash", async () => {
    const file = join(await tempDir(), "uploads.json");
    const failedApi = createApi({
      settings,
      fetch: async () => {
        throw new Error("network down");
      },
    });
    const queue = await openUploadQueue(file);
    const uploader = createResultUploader({
      api: failedApi,
      queue,
      identity: () => identity,
    });
    const finished = await finishedTest();
    await uploader.accept(finished);
    expect(uploader.last()?.state).toBe("queued");
    const reopened = await openUploadQueue(file);
    expect(reopened.entries()[0]?.result.offline).toBe(true);
    const requests: CompletedEvent[] = [];
    const api = createApi({
      settings,
      fetch: async (_input, init) => {
        const body = JSON.parse(
          typeof init?.body === "string" ? init.body : "",
        ) as { result: unknown };
        requests.push(CompletedEventSchema.parse(body.result));
        return Response.json({
          ...uploadResponse,
          data: { ...uploadResponse.data, isPb: false, xp: 0 },
        });
      },
    });
    await createResultUploader({
      api,
      queue: reopened,
      identity: () => identity,
    }).drain();
    expect(requests[0]).toMatchObject({
      offline: true,
      client: "tui",
      timestamp: finished.result.timestamp,
    });
    const { hash, ...payload } = requests[0] as CompletedEvent;
    expect(hash).toBe(await hashResult(payload));
    expect((await openUploadQueue(file)).entries()).toHaveLength(0);
  });

  test("never sends another account/server's queue or silently claims guest results", async () => {
    let requests = 0;
    const api = createApi({
      settings,
      fetch: async () => {
        requests++;
        return Response.json(uploadResponse);
      },
    });
    const queue = createUploadQueue();
    let current = { ...identity, online: false };
    const uploader = createResultUploader({
      api,
      queue,
      identity: () => current,
    });
    const finished = await finishedTest();
    await uploader.accept(finished);
    current = { ...identity, uid: "other-user" };
    await uploader.drain();
    current = { ...identity, apiUrl: "https://other.test/api" };
    await uploader.drain();
    expect(requests).toBe(0);
    await uploader.accept({ ...finished, owner: undefined });
    await uploader.accept({ ...finished, invalid: "repeated" });
    expect(queue.entries()).toHaveLength(1);
    current = identity;
    await uploader.drain();
    expect(requests).toBe(1);
  });

  test("expires old uploads while retaining local history and skips malformed queue entries", async () => {
    const file = join(await tempDir(), "uploads.json");
    const queue = await openUploadQueue(file);
    const history = createHistoryStore();
    const finished = await finishedTest();
    finished.result.timestamp = Date.now() - maxUploadAge - 1;
    expect(await history.add(finished)).toBe(true);
    await queue.add(
      identity.apiUrl,
      await uploadPayload(finished.result, identity.uid, true),
    );
    await writeJson(file, {
      version: 1,
      entries: [...queue.entries(), { malformed: true }],
    });
    const reopened = await openUploadQueue(file);
    expect(reopened.notice()).toContain("invalid");
    await reopened.expire();
    expect(reopened.entries()).toHaveLength(0);
    expect(history.entries()).toHaveLength(1);
    expect(reopened.notice()).toContain("local history retained");
  });

  test("retries transient errors and quarantines permanent rejection without repeated submissions", async () => {
    for (const status of [401, 429, 503, 460, 465]) {
      const queue = createUploadQueue();
      let requests = 0;
      const uploader = createResultUploader({
        queue,
        identity: () => identity,
        api: createApi({
          settings,
          fetch: async () => {
            requests++;
            return Response.json({ message: "Rejected" }, { status });
          },
        }),
      });
      await uploader.accept(await finishedTest());
      const retry = [401, 429, 503].includes(status);
      expect(queue.entries()[0]?.state).toBe(retry ? "pending" : "rejected");
      await uploader.drain();
      expect(requests).toBe(retry ? 2 : 1);
    }
  });

  test("removes acknowledged duplicates and refuses an upload when durable queue writes fail", async () => {
    const duplicate = createApi({
      settings,
      fetch: async () =>
        Response.json({ message: "Duplicate result" }, { status: 466 }),
    });
    const queue = createUploadQueue();
    await createResultUploader({
      api: duplicate,
      queue,
      identity: () => identity,
    }).accept(await finishedTest());
    expect(queue.entries()).toHaveLength(0);
    const blocked = join(await tempDir(), "blocked");
    await writeJson(blocked, {});
    let requests = 0;
    const api = createApi({
      settings,
      fetch: async () => {
        requests++;
        return Response.json(uploadResponse);
      },
    });
    const failed = createUploadQueue([], join(blocked, "uploads.json"));
    const uploader = createResultUploader({
      api,
      queue: failed,
      identity: () => identity,
    });
    await uploader.accept(await finishedTest());
    await uploader.drain();
    expect(requests).toBe(0);
    expect(uploader.last()?.state).toBe("error");
  });

  test("shows expiry for the latest queued result without retaining previous screen results", async () => {
    const queue = createUploadQueue();
    let online = false;
    const uploader = createResultUploader({
      queue,
      identity: () => ({ ...identity, online }),
      api: createApi({
        settings,
        fetch: async () => Response.json(uploadResponse),
      }),
    });
    const older = await finishedTest({ ...identity, online: false });
    await uploader.accept(older);
    const latest = await finishedTest({ ...identity, online: false });
    latest.result.timestamp = Date.now() - maxUploadAge - 1;
    await uploader.accept(latest);
    online = true;
    await uploader.drain();
    expect(uploader.last()?.result).toBe(latest.result);
    expect(uploader.last()?.message).toContain("expired");
    expect(queue.entries()).toHaveLength(0);
  });
});
