import { describe, expect, test } from "bun:test";
import { chmod, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { createApi, type Fetch } from "../src/api/client";
import { networkSettingsSchema } from "../src/api/settings";
import { openCredentials } from "../src/auth/credentials";
import {
  pollDeviceToken,
  requestDeviceCode,
  type DeviceCode,
} from "../src/auth/device";
import { createAuthStore } from "../src/auth/store";
import { tempDir } from "./helpers/temp-dir";

const settings = networkSettingsSchema.parse({
  apiUrl: "https://example.test/api",
});
const code: DeviceCode = {
  device_code: "private",
  user_code: "ABCD-1234",
  verification_uri: "https://example.test/device",
  verification_uri_complete: "https://example.test/device?user_code=ABCD-1234",
  expires_in: 30,
  interval: 1,
};
const token = {
  access_token: "secret",
  token_type: "Bearer",
  expires_in: 3600,
};
const session = {
  session: { expiresAt: new Date(Date.now() + 3600_000).toISOString() },
  user: { id: "user-one", name: "Tester" },
};
async function auth(fetcher?: Fetch): Promise<{
  file: string;
  credentials: Awaited<ReturnType<typeof openCredentials>>;
  api: ReturnType<typeof createApi>;
  requests: { path: string; headers: Headers; body?: unknown }[];
  browser: string[];
  store: ReturnType<typeof createAuthStore>;
}> {
  const file = join(await tempDir(), "credentials.json");
  const credentials = await openCredentials(file, settings.apiUrl);
  const requests: { path: string; headers: Headers; body?: unknown }[] = [];
  const api = createApi({
    settings,
    token: () => credentials.get()?.accessToken,
    fetch: async (input, init) => {
      const path = new URL(input instanceof Request ? input.url : input)
        .pathname;
      requests.push({
        path,
        headers: new Headers(init?.headers),
        ...(typeof init?.body === "string"
          ? { body: JSON.parse(init.body) as unknown }
          : {}),
      });
      if (fetcher !== undefined) return await fetcher(input, init);
      return Response.json(
        path.endsWith("/code")
          ? code
          : path.endsWith("/get-session")
            ? session
            : {},
      );
    },
  });
  const browser: string[] = [];
  const store = createAuthStore({
    api,
    credentials,
    browser: async (url) => {
      browser.push(url);
    },
    poll: async () => token,
  });
  return { file, credentials, api, requests, browser, store };
}

describe("device login and credentials", () => {
  test("verifies the session, opens consent and stores a 0600 token bound to its server", async () => {
    const client = await auth();
    await client.store.login();
    expect(client.store.state()).toBe("authenticated");
    expect(client.store.user()).toEqual({ uid: "user-one", name: "Tester" });
    expect(client.browser).toEqual([code.verification_uri_complete ?? ""]);
    expect(client.requests[0]?.headers.has("authorization")).toBe(false);
    expect(client.requests[1]?.headers.get("authorization")).toBe(
      "Bearer secret",
    );
    expect((await stat(client.file)).mode & 0o777).toBe(0o600);
    expect(
      (await openCredentials(client.file, settings.apiUrl)).get()?.accessToken,
    ).toBe("secret");
    expect(
      (await openCredentials(client.file, "https://other.test/api")).get(),
    ).toBeUndefined();
    await chmod(client.file, 0o644);
    await openCredentials(client.file, settings.apiUrl);
    expect((await stat(client.file)).mode & 0o777).toBe(0o600);
  });

  test("waits the polling interval, slows down, and never sends an existing bearer to device endpoints", async () => {
    let clock = 0;
    const waits: number[] = [];
    const responses = [
      { status: 400, body: { error: "authorization_pending" } },
      { status: 400, body: { error: "slow_down" } },
      { status: 200, body: token },
    ];
    const api = createApi({
      settings,
      token: () => "old-session",
      fetch: async (_input, init) => {
        expect(new Headers(init?.headers).has("authorization")).toBe(false);
        const response = responses.shift();
        if (response === undefined) throw new Error("Unexpected request");
        return Response.json(response.body, { status: response.status });
      },
    });
    expect(
      await pollDeviceToken(api, code, new AbortController().signal, {
        now: () => clock,
        wait: async (ms) => {
          waits.push(ms);
          clock += ms;
        },
      }),
    ).toEqual(token);
    expect(waits).toEqual([1000, 1000, 6000]);
  });

  test("stops on denial, expiry and cancellation", async () => {
    for (const error of ["access_denied", "expired_token"]) {
      const api = createApi({
        settings,
        fetch: async () => Response.json({ error }, { status: 400 }),
      });
      const result = await pollDeviceToken(
        api,
        code,
        new AbortController().signal,
        { wait: async () => undefined },
      ).catch((caught: unknown) => caught);
      expect(String(result)).toContain(
        error === "access_denied" ? "denied" : "expired",
      );
    }
    const client = await auth();
    let resolve!: (value: typeof token) => void;
    const store = createAuthStore({
      api: client.api,
      credentials: client.credentials,
      browser: async () => undefined,
      poll: async () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    const login = store.login();
    while (store.device() === undefined) await Bun.sleep(1);
    store.cancel();
    resolve(token);
    await login;
    expect(client.credentials.get()).toBeUndefined();
    expect(store.state()).toBe("guest");
  });

  test("keeps offline sessions and failed revocations retryable, then removes the token on logout", async () => {
    const client = await auth();
    await client.store.login();
    const offline = createApi({
      settings,
      token: () => client.credentials.get()?.accessToken,
      fetch: async () => {
        throw new Error("offline");
      },
    });
    const store = createAuthStore({
      api: offline,
      credentials: client.credentials,
    });
    expect(await store.check()).toBe(false);
    expect(store.state()).toBe("offline");
    await store.logout();
    expect(store.notice()).toContain("retry to revoke");
    expect(client.credentials.get()?.accessToken).toBe("secret");
    await client.store.logout();
    expect(client.requests.at(-1)?.path).toBe("/api/auth/sign-out");
    expect(client.requests.at(-1)?.headers.get("authorization")).toBe(
      "Bearer secret",
    );
    expect(client.credentials.get()).toBeUndefined();
    expect(await readFile(client.file).catch(() => undefined)).toBeUndefined();
  });

  test("clears expired and revoked sessions instead of breaking offline typing", async () => {
    const client = await auth();
    await client.store.login();
    const expired = createAuthStore({
      api: client.api,
      credentials: client.credentials,
      now: () => Date.now() + 7200_000,
    });
    expect(await expired.check()).toBe(false);
    expect(expired.user()).toBeUndefined();
    await client.credentials.flush();
    await client.store.login();
    const revoked = createAuthStore({
      credentials: client.credentials,
      api: createApi({ settings, fetch: async () => Response.json(null) }),
    });
    expect(await revoked.check()).toBe(false);
    expect(revoked.notice()).toContain("expired");
    await client.credentials.flush();
    expect(client.credentials.get()).toBeUndefined();
  });

  test("rejects invalid consent URLs", async () => {
    const client = createApi({
      settings,
      fetch: async () =>
        Response.json({ ...code, verification_uri: "file:///tmp/file" }),
    });
    expect(
      await requestDeviceCode(client).catch((error: unknown) => error),
    ).toBeInstanceOf(Error);
  });

  test("keeps consent available when the browser cannot launch", async () => {
    const client = await auth();
    let release!: (value: typeof token) => void;
    const store = createAuthStore({
      api: client.api,
      credentials: client.credentials,
      browser: async () => {
        throw new Error("headless");
      },
      poll: async () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    });
    const login = store.login();
    while (store.notice() === undefined) await Bun.sleep(1);
    expect(store.device()?.user_code).toBe(code.user_code);
    expect(store.notice()).toContain("Open the link");
    release(token);
    await login;
    expect(store.state()).toBe("authenticated");
  });
});
