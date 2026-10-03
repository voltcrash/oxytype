import { afterEach, expect, it, vi } from "vite-plus/test";

const config = vi.hoisted(() => ({ backendUrl: "/api", clientVersion: "7" }));
vi.unmock("../src/ts/auth-client");
vi.mock("virtual:env-config", () => ({ envConfig: config }));
vi.mock("../src/ts/states/core", () => ({ setUserId: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it.each([
  ["/api", `${window.location.origin}/api/auth/get-session`],
  ["http://localhost:5005", "http://localhost:5005/auth/get-session"],
  [
    "https://api.example.test/custom-api/",
    "https://api.example.test/custom-api/auth/get-session",
  ],
])(
  "fetches cookie sessions through the configured API (%s)",
  async (backendUrl, expectedUrl) => {
    config.backendUrl = backendUrl;
    vi.resetModules();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(null));
    vi.stubGlobal("fetch", fetch);
    const { authClient } = await import("../src/ts/auth-client");
    const session = await authClient.getSession();
    expect(session.error).toBeNull();
    expect(fetch).toHaveBeenCalledOnce();
    const input = fetch.mock.calls[0]?.[0];
    expect(
      input instanceof URL
        ? input.href
        : input instanceof Request
          ? input.url
          : input,
    ).toBe(expectedUrl);
    expect(fetch.mock.calls[0]?.[1]?.credentials).toBe("include");
  },
);
