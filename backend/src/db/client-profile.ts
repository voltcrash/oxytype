import type { Client, PersonalBests } from "@oxytype/schemas/shared";
import type { DBUser } from "../dal/user";
import type { LbPersonalBests } from "../utils/pb";
import type { CountByYearAndDay, UserStreak } from "@oxytype/schemas/users";
import { statement } from "./client";

export type ClientProfile = {
  personalBests: PersonalBests;
  lbPersonalBests?: LbPersonalBests;
  completedTests?: number;
  startedTests?: number;
  timeTyping?: number;
  streak?: UserStreak;
  testActivity?: CountByYearAndDay;
  xp?: number;
  bananas?: number;
  tagPersonalBests?: Record<string, PersonalBests>;
};
export function emptyPersonalBests(): PersonalBests {
  return { time: {}, words: {}, quote: {}, zen: {}, custom: {} };
}
export function clientProfile(
  user: DBUser,
  client: Client = "web",
): ClientProfile {
  // Existing top-level fields remain the web cache for backward compatibility.
  if (client === "web") return user;
  return ((user.clientProfiles ??= {}).tui ??= {
    personalBests: emptyPersonalBests(),
    lbPersonalBests: { time: {} },
    completedTests: 0,
    startedTests: 0,
    timeTyping: 0,
    xp: 0,
    testActivity: {},
    streak: { length: 0, maxLength: 0, lastResultTimestamp: 0 },
  });
}
export function extractClientProfile(user: DBUser): ClientProfile {
  const {
    personalBests,
    lbPersonalBests,
    completedTests,
    startedTests,
    timeTyping,
    streak,
    testActivity,
    xp,
    bananas,
  } = user;
  return {
    personalBests,
    lbPersonalBests,
    completedTests,
    startedTests,
    timeTyping,
    streak,
    testActivity,
    xp,
    bananas,
    tagPersonalBests: Object.fromEntries(
      (user.tags ?? []).map((tag) => [
        tag._id,
        tag.personalBests ?? emptyPersonalBests(),
      ]),
    ),
  };
}
export async function attachClientProfiles(user: DBUser): Promise<DBUser> {
  const rows = await statement(
    "SELECT client,data FROM client_profiles WHERE uid=? AND client='tui'",
    user.uid,
  ).all<{ client: Client; data: string }>();
  user.clientProfiles = Object.fromEntries(
    rows.results.map((row) => [
      row.client,
      JSON.parse(row.data) as ClientProfile,
    ]),
  );
  return user;
}
export function projectClientUser(
  user: DBUser,
  client: Client = "web",
): DBUser {
  if (client === "web") return user;
  const profile = clientProfile(user, client);
  return {
    ...user,
    ...profile,
    tags: user.tags?.map((tag) => ({
      ...tag,
      personalBests:
        profile.tagPersonalBests?.[tag._id] ?? emptyPersonalBests(),
    })),
  };
}
export function clientBoard(key: string, client: Client = "web"): string {
  return client === "web" ? key : `${client}:${key}`;
}
