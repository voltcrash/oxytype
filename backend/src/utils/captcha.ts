import { envValue } from "../runtime/env";
import { isDevEnvironment } from "./misc";

type CaptchaData = {
  success: boolean;
  challenge_ts?: number;
  hostname: string;
  "error-codes"?: string[];
};

export async function verify(captcha: string): Promise<boolean> {
  const recaptchaSecret = envValue("RECAPTCHA_SECRET") ?? null;
  if (isDevEnvironment()) {
    return true;
  }

  if (recaptchaSecret === null) {
    throw new Error("RECAPTCHA_SECRET is not defined");
  }

  const response = await fetch(
    `https://www.google.com/recaptcha/api/siteverify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: recaptchaSecret, response: captcha }),
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!response.ok) {
    return false;
  } else {
    const captchaData = (await response.json()) as CaptchaData;
    return captchaData.success;
  }
}
