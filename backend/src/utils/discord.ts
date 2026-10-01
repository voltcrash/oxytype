import { getFrontendUrl } from "./misc";
import * as RedisClient from "../init/redis";
import { randomBytes } from "crypto";
import MonkeyError from "./error";
import { z } from "zod";
import { parseWithSchema as parseJsonWithSchema } from "@monkeytype/util/json";

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
  const clientId = process.env["DISCORD_CLIENT_ID"];
  if (clientId === undefined || clientId === "") {
    throw new MonkeyError(503, "Discord connection is not configured");
  }

  const connection = RedisClient.getConnection();
  if (!connection) {
    throw new MonkeyError(500, "Redis connection not found");
  }
  const redirectUri = encodeURIComponent(
    `${getFrontendUrl().replace(/\/$/, "")}/verify`,
  );
  const token = randomBytes(10).toString("hex");
  await connection.setex(`discordoauth:${uid}`, 60, token);
  return `${BASE_URL}/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${redirectUri}&response_type=token&scope=identify&state=${token}`;
}

export async function iStateValidForUser(
  state: string,
  uid: string,
): Promise<boolean> {
  const connection = RedisClient.getConnection();
  if (!connection) {
    throw new MonkeyError(500, "Redis connection not found");
  }
  const redisToken = await connection.getdel(`discordoauth:${uid}`);

  return redisToken === state;
}
