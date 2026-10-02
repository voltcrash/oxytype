import { getFrontendUrl } from "./misc";
import { statement } from "../db/client";
import { envValue } from "../runtime/env";
import { randomBytes } from "crypto";
import MonkeyError from "./error";
import { z } from "zod/v3";
import { parseWithSchema as parseJsonWithSchema } from "@oxytype/util/json";

const BASE_URL = "https://discord.com/api";

const DiscordIdAndAvatarSchema = z.object({
  id: z.string(),
  avatar: z
    .string()
    .optional()
    .or(z.null().transform(() => undefined)),
});
type DiscordIdAndAvatar = z.infer<typeof DiscordIdAndAvatarSchema>;

export async function getDiscordUser(
  tokenType: string,
  accessToken: string,
): Promise<DiscordIdAndAvatar> {
  const response = await fetch(`${BASE_URL}/users/@me`, {
    headers: {
      authorization: `${tokenType} ${accessToken}`,
    },
  });

  const parsed = parseJsonWithSchema(
    await response.text(),
    DiscordIdAndAvatarSchema,
  );

  return parsed;
}

export async function getOauthLink(uid: string): Promise<string> {
  const clientId = envValue("DISCORD_CLIENT_ID");
  if (clientId === undefined || clientId === "") {
    throw new MonkeyError(503, "Discord connection is not configured");
  }

  const redirectUri = encodeURIComponent(
    `${getFrontendUrl().replace(/\/$/, "")}/verify`,
  );
  const token = randomBytes(10).toString("hex");
  await statement(
    "INSERT INTO oauth_states(uid,token,expires_at) VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at",
    uid,
    token,
    Date.now() + 60000,
  ).run();
  return `${BASE_URL}/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${redirectUri}&response_type=token&scope=identify&state=${token}`;
}

export async function iStateValidForUser(
  state: string,
  uid: string,
): Promise<boolean> {
  const consumed = await statement(
    "DELETE FROM oauth_states WHERE uid=? RETURNING token,expires_at AS expiresAt",
    uid,
  ).first<{ token: string; expiresAt: number }>();
  return (
    consumed !== null &&
    consumed.expiresAt > Date.now() &&
    consumed.token === state
  );
}
