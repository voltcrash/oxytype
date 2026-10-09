import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { createApi } from "../src/api/client";
import { networkSettingsSchema } from "../src/api/settings";
import { openCredentials } from "../src/auth/credentials";
import { createAuthStore } from "../src/auth/store";
import { runAuthCommand } from "../src/cli/auth";
import { tempDir } from "./helpers/temp-dir";

describe("CLI device commands", () => {
  test("prints consent, saves credentials and revokes logout without a renderer", async () => {
    const settings = networkSettingsSchema.parse({
      apiUrl: "https://example.test/api",
    });
    const credentials = await openCredentials(
      join(await tempDir(), "credentials.json"),
      settings.apiUrl,
    );
    const paths: string[] = [];
    const api = createApi({
      settings,
      fetch: async (input) => {
        const path = new URL(input instanceof Request ? input.url : input)
          .pathname;
        paths.push(path);
        return Response.json(
          path.endsWith("/device/code")
            ? {
                device_code: "private-device",
                user_code: "ABCD-1234",
                verification_uri: "https://example.test/device",
                expires_in: 600,
                interval: 1,
              }
            : path.endsWith("/get-session")
              ? {
                  session: {
                    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
                  },
                  user: { id: "tester", name: "Tester" },
                }
              : {},
        );
      },
    });
    const auth = createAuthStore({
      api,
      credentials,
      browser: async () => undefined,
      poll: async () => ({
        access_token: "private-token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    });
    const lines: string[] = [];
    const listeners = process.listenerCount("SIGINT");
    expect(
      await runAuthCommand("login", auth, (line) => lines.push(line)),
    ).toBe(0);
    expect(lines).toContain("Open https://example.test/device");
    expect(lines).toContain("Code: ABCD-1234");
    expect(lines.join("\n")).not.toContain("private-");
    expect(credentials.get()?.accessToken).toBe("private-token");
    expect(
      await runAuthCommand("logout", auth, (line) => lines.push(line)),
    ).toBe(0);
    expect(paths).toContain("/api/auth/sign-out");
    expect(credentials.get()).toBeUndefined();
    expect(process.listenerCount("SIGINT")).toBe(listeners);
  });

  test("failed and cancelled login return nonzero and remove signal listeners", async () => {
    const settings = networkSettingsSchema.parse({});
    const credentials = await openCredentials(
      join(await tempDir(), "credentials.json"),
      settings.apiUrl,
    );
    const auth = createAuthStore({
      api: createApi({
        settings,
        fetch: async () =>
          Response.json({ message: "Denied" }, { status: 403 }),
      }),
      credentials,
    });
    const lines: string[] = [];
    expect(
      await runAuthCommand("login", auth, (line) => lines.push(line)),
    ).toBe(1);
    expect(lines).toContain("Denied");
    const cancelling = {
      ...auth,
      login: async () => {
        process.emit("SIGINT");
      },
    };
    const listeners = process.listenerCount("SIGINT");
    expect(await runAuthCommand("login", cancelling, () => undefined)).toBe(
      130,
    );
    expect(process.listenerCount("SIGINT")).toBe(listeners);
  });
});
