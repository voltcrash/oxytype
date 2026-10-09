import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { ApiError, createApi, TransportError } from "../src/api/client";
import {
  networkSettingsSchema,
  openNetworkSettings,
} from "../src/api/settings";
import { writeJson } from "../src/storage/json";
import { tempDir } from "./helpers/temp-dir";

describe("native API", () => {
  test("loads native settings with environment precedence", async () => {
    const file = join(await tempDir(), "network.json");
    await writeJson(file, {
      apiUrl: "http://localhost:5005/api/",
      timeoutMs: 500,
    });
    expect(
      await openNetworkSettings(file, {
        OXYTYPE_API_URL: "https://example.test/api",
      }),
    ).toMatchObject({ apiUrl: "https://example.test/api", timeoutMs: 500 });
    expect(
      networkSettingsSchema.safeParse({ apiUrl: "file:///tmp/api" }).success,
    ).toBe(false);
    expect(
      networkSettingsSchema.safeParse({
        apiUrl: "https://user:password@example.test",
      }).success,
    ).toBe(false);
  });

  test("calls public contracts and supplies bearer auth only to private endpoints", async () => {
    const requests: Request[] = [];
    const server = Bun.serve({
      port: 0,
      fetch: (request) => {
        requests.push(request.clone());
        return Response.json(
          new URL(request.url).pathname.endsWith("typingStats")
            ? {
                message: "ok",
                data: { testsStarted: 1, testsCompleted: 1, timeTyping: 10 },
              }
            : { message: "ok", data: null },
        );
      },
    });
    try {
      let token = "first";
      const api = createApi({
        settings: networkSettingsSchema.parse({
          apiUrl: `${server.url.href}api`,
        }),
        token: () => token,
      });
      expect(
        (await api.client.public.getTypingStats({ query: { client: "tui" } }))
          .status,
      ).toBe(200);
      expect(requests[0]?.headers.has("authorization")).toBe(false);
      expect(new URL(requests[0]?.url ?? "").searchParams.get("client")).toBe(
        "tui",
      );
      await api.client.configs.get();
      expect(requests[1]?.headers.get("authorization")).toBe("Bearer first");
      token = "second";
      await api.client.configs.get();
      expect(requests[2]?.headers.get("authorization")).toBe("Bearer second");
      expect(
        requests.every(
          (request) =>
            !request.headers.has("origin") && !request.headers.has("cookie"),
        ),
      ).toBe(true);
    } finally {
      await server.stop(true);
    }
  });

  test("distinguishes server errors, malformed responses, expiry and timeouts", async () => {
    let expired = 0;
    const settings = networkSettingsSchema.parse({ timeoutMs: 100 });
    const api = createApi({
      settings,
      token: () => "secret",
      onUnauthorized: () => expired++,
      fetch: async () => Response.json({ message: "Expired" }, { status: 401 }),
    });
    expect((await api.client.configs.get()).status).toBe(401);
    expect(expired).toBe(1);
    const invalid = createApi({
      settings,
      fetch: async () => Response.json({ data: "bad" }),
    });
    expect(
      await invalid.client.configs.get().catch((error: unknown) => error),
    ).toBeInstanceOf(ApiError);
    const slow = createApi({
      settings,
      fetch: async (_input, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        }),
    });
    expect(
      await slow.client.configs.get().catch((error: unknown) => error),
    ).toBeInstanceOf(TransportError);
    const incompatible = createApi({
      settings,
      fetch: async () =>
        Response.json(
          {},
          {
            headers: { "X-Compatibility-Check": "999" },
          },
        ),
    });
    expect(
      String(
        await incompatible.client.configs
          .get()
          .catch((error: unknown) => error),
      ),
    ).toContain("versions differ");
  });
});
