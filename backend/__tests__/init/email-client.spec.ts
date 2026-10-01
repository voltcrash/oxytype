import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { init, sendEmail } from "../../src/init/email-client";

const { sendMail } = vi.hoisted(() => ({
  sendMail: vi.fn().mockResolvedValue({
    response: "accepted",
    accepted: ["recipient@example.test"],
  }),
}));

vi.mock("nodemailer", () => ({
  createTransport: () => ({
    verify: async () => true,
    sendMail,
  }),
}));
vi.mock("../../src/utils/prometheus", () => ({ recordEmail: vi.fn() }));

const cases = [
  {
    type: "verify" as const,
    subject: "Verify your Oxytype account",
    data: { name: "Coder", verificationLink: "https://example.test/verify" },
  },
  {
    type: "resetPassword" as const,
    subject: "Reset your Oxytype password",
    data: { name: "Coder", passwordResetLink: "https://example.test/reset" },
  },
];

describe("email templates", () => {
  beforeAll(async () => {
    vi.stubEnv("EMAIL_HOST", "smtp.example.test");
    vi.stubEnv("EMAIL_USER", "test");
    vi.stubEnv("EMAIL_PASS", "test");
    vi.stubEnv("EMAIL_PORT", "465");
    vi.stubEnv("EMAIL_FROM", "sender@example.test");
    await init();
  });
  beforeEach(() => sendMail.mockClear());
  afterAll(() => vi.unstubAllEnvs());

  it.each(cases)(
    "renders $type before passing HTML to the transport",
    async ({ type, subject, data }) => {
      const result = await sendEmail(type, "recipient@example.test", data);

      expect(result).toEqual({ success: true, message: "accepted" });
      expect(sendMail).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          to: "recipient@example.test",
          subject,
          html: expect.stringContaining("Coder"),
        }),
      );
    },
  );
});
