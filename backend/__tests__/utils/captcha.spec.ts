import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { verify } from "../../src/utils/captcha";

const fetchMock = vi.fn<typeof fetch>();
const success = {
  success: true,
  hostname: "staging.example.test",
  action: "signup",
};

beforeEach(() => {
  vi.stubEnv("MODE", "production");
  vi.stubEnv("FRONTEND_URL", "https://staging.example.test:443");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "private-test-fixture");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(Response.json(success));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Turnstile verification", () => {
  it("accepts only a verified token for this hostname and action", async () => {
    expect(await verify("opaque-token", "signup")).toBe(true);
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(options?.method).toBe("POST");
    expect(options?.body).toEqual(
      new URLSearchParams({
        secret: "private-test-fixture",
        response: "opaque-token",
      }),
    );
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    { ...success, hostname: "attacker.example.test" },
    { ...success, action: "quote-submit" },
    { success: true },
    { ...success, success: "true" },
    { success: false, "error-codes": ["timeout-or-duplicate"] },
    null,
    [],
  ])("rejects untrusted/missing metadata or spent tokens: %j", async (data) => {
    fetchMock.mockResolvedValue(Response.json(data));
    expect(await verify("opaque-token", "signup")).toBe(false);
  });

  it.each(["", "a".repeat(2049)])(
    "rejects invalid token length before requesting verification",
    async (token) => {
      expect(await verify(token, "signup")).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("fails closed on a service failure", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    expect(await verify("token", "signup")).toBe(false);
    fetchMock.mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
    await expect(verify("token", "signup")).rejects.toThrow("Timed out");
    fetchMock.mockResolvedValue(new Response("not JSON"));
    await expect(verify("token", "signup")).rejects.toThrow();
  });

  it("requires credentials even in development", async () => {
    vi.stubEnv("MODE", "dev");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    await expect(verify("token", "signup")).rejects.toThrow(
      "TURNSTILE_SECRET_KEY",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["1", "2", "3"])(
    "rejects Cloudflare test secret %s in production",
    async (prefix) => {
      vi.stubEnv(
        "TURNSTILE_SECRET_KEY",
        `${prefix}x0000000000000000000000000000000AA`,
      );
      await expect(verify("XXXX.DUMMY.TOKEN.XXXX", "signup")).rejects.toThrow(
        "MODE=dev",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("allows dummy metadata only with a test secret and dummy token in dev", async () => {
    vi.stubEnv("MODE", "dev");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    fetchMock.mockImplementation(async () =>
      Response.json({ success: true, hostname: "example.com" }),
    );
    expect(await verify("XXXX.DUMMY.TOKEN.XXXX", "signup")).toBe(true);
    expect(await verify("arbitrary-token", "signup")).toBe(false);
    fetchMock.mockResolvedValue(Response.json({ success: false }));
    expect(await verify("XXXX.DUMMY.TOKEN.XXXX", "signup")).toBe(false);
  });

  it("keeps hostname/action checks for real keys in development", async () => {
    vi.stubEnv("MODE", "dev");
    fetchMock.mockResolvedValue(Response.json({ ...success, action: "test" }));
    expect(await verify("token", "signup")).toBe(false);
  });
});
