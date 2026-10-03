import { eq, and, desc, inArray } from "drizzle-orm";
import {
  canFunboxGetPb,
  checkAndUpdatePb,
  type LbPersonalBests,
} from "../utils/pb";
import MonkeyError from "../utils/error";
import { type WithObjectId } from "../utils/misc";
import { newId, type StoredId } from "../utils/id";
import {
  database,
  statement,
  encode,
  isUniqueViolation,
  chunks,
} from "../db/client";
import { mutateUser, readUser, stage } from "../db/mutation";
import { users, inbox, rewardGrants, connections } from "../db/schema";
import { getCachedConfiguration } from "../init/configuration";
import { getDayOfYear } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import type {
  Badge,
  CustomTheme,
  MonkeyMail,
  UserInventory,
  UserProfileDetails,
  UserQuoteRatings,
  UserStreak,
  ResultFilters,
  UserTag,
  User,
  CountByYearAndDay,
  Friend,
} from "@oxytype/schemas/users";
import type {
  Mode,
  Mode2,
  PersonalBest,
  PersonalBests,
} from "@oxytype/schemas/shared";
import type { Result as ResultType } from "@oxytype/schemas/results";
import type { Configuration } from "@oxytype/schemas/configuration";
import { isToday, isYesterday } from "@oxytype/util/date-and-time";
import { addImportantLog } from "./logs";
import GeorgeQueue from "../queues/george-queue";

export type DBUserTag = WithObjectId<UserTag>;

export type DBUser = Omit<
  User,
  | "resultFilterPresets"
  | "tags"
  | "customThemes"
  | "isPremium"
  | "allTimeLbs"
  | "testActivity"
> & {
  _id: StoredId;
  resultFilterPresets?: WithObjectId<ResultFilters>[];
  tags?: DBUserTag[];
  lbPersonalBests?: LbPersonalBests;
  customThemes?: WithObjectId<CustomTheme>[];
  autoBanTimestamps?: number[];
  inbox?: MonkeyMail[];
  ips?: string[];
  canReport?: boolean;
  nameHistory?: string[];
  lastNameChange?: number;
  canManageApeKeys?: boolean;
  bananas?: number;
  testActivity?: CountByYearAndDay;
  suspicious?: boolean;
  note?: string;
};

type Result = Omit<ResultType<Mode>, "_id" | "name">;
export type DBFriend = Friend;
const emptyPb = (): PersonalBests => ({
  time: {},
  words: {},
  quote: {},
  zen: {},
  custom: {},
});

export async function addUser(
  name: string,
  email: string,
  uid: string,
): Promise<void> {
  const user: DBUser = {
    _id: newId(),
    name,
    email,
    uid,
    addedAt: Date.now(),
    personalBests: emptyPb(),
    testActivity: {},
  };
  try {
    await database().insert(users).values({
      uid,
      id: user._id.toString(),
      name,
      nameKey: name.toLowerCase(),
      email,
      addedAt: user.addedAt,
      data: user,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new MonkeyError(
        409,
        "User document or name already exists",
        "addUser",
      );
    }
    throw error;
  }
}
export async function exists(uid: string): Promise<boolean> {
  return (await readUser(uid)) !== undefined;
}
export async function deleteUser(uid: string): Promise<void> {
  await database().delete(users).where(eq(users.uid, uid));
}
export async function resetUser(uid: string): Promise<void> {
  await mutateUser(uid, async (user) => {
    if (user.banned) {
      throw new MonkeyError(403, "Banned users cannot reset their account");
    }
    Object.assign(user, {
      personalBests: emptyPb(),
      lbPersonalBests: { time: {} },
      completedTests: 0,
      startedTests: 0,
      timeTyping: 0,
      lbMemory: {},
      bananas: 0,
      profileDetails: { bio: "", keyboard: "", socialProfiles: {} },
      favoriteQuotes: {},
      customThemes: [],
      tags: [],
      xp: 0,
      streak: { length: 0, lastResultTimestamp: 0, maxLength: 0 },
      testActivity: {},
    });
    delete user.discordAvatar;
    delete user.discordId;
    delete user.lbOptOut;
    delete user.inbox;
    await stage(
      statement("UPDATE reward_grants SET claimed=1 WHERE uid=?", uid),
    );
    for (const table of [
      "inbox",
      "user_activity",
      "leaderboard_bests",
      "leaderboard_snapshots",
      "daily_entries",
      "weekly_entries",
      "results",
      "configs",
      "presets",
      "ape_keys",
    ]) {
      await stage(statement(`DELETE FROM ${table} WHERE uid=?`, uid));
    }
    await stage(
      statement(
        "DELETE FROM outbox WHERE uid=? AND type='reward' AND completed_at IS NULL",
        uid,
      ),
    );
  });
}
export async function updateName(
  uid: string,
  name: string,
  previousName: string,
): Promise<void> {
  if (name === previousName) {
    throw new MonkeyError(400, "New name is the same as the old name");
  }
  try {
    await mutateUser(uid, (user) => {
      user.name = name;
      user.lastNameChange = Date.now();
      delete user.needsToChangeName;
      (user.nameHistory ??= []).push(previousName);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new MonkeyError(409, "Username already taken", name);
    }
    throw error;
  }
}
export async function flagForNameChange(uid: string): Promise<void> {
  await mutateUser(uid, (user) => {
    user.needsToChangeName = true;
  });
}
export async function clearPb(uid: string): Promise<void> {
  await mutateUser(uid, async (user) => {
    user.personalBests = emptyPb();
    user.lbPersonalBests = { time: {} };
    await stage(statement("DELETE FROM leaderboard_bests WHERE uid=?", uid));
  });
}
export async function optOutOfLeaderboards(uid: string): Promise<void> {
  await mutateUser(uid, async (user) => {
    user.lbOptOut = true;
    user.lbPersonalBests = { time: {} };
    for (const table of [
      "leaderboard_bests",
      "daily_entries",
      "weekly_entries",
    ]) {
      await stage(statement(`DELETE FROM ${table} WHERE uid=?`, uid));
    }
  });
}
export async function updateQuoteRatings(
  uid: string,
  quoteRatings: UserQuoteRatings,
): Promise<boolean> {
  await mutateUser(uid, (user) => {
    user.quoteRatings = quoteRatings;
  });
  return true;
}
export async function getUser(uid: string, stack: string): Promise<DBUser> {
  const user = await readUser(uid);
  if (!user) throw new MonkeyError(404, "User not found", stack);
  user.personalBests ??= emptyPb();
  user.inbox = await readInbox(uid);
  return user;
}
export async function getPartialUser<K extends keyof DBUser>(
  uid: string,
  stack: string,
  fields: K[],
): Promise<Pick<DBUser, K>> {
  const user = await getUser(uid, stack);
  return Object.fromEntries(
    fields
      .filter((key) => user[key] !== undefined)
      .map((key) => [key, user[key]]),
  ) as Pick<DBUser, K>;
}
export async function findByName(name: string): Promise<DBUser | undefined> {
  const row = await database()
    .select()
    .from(users)
    .where(eq(users.nameKey, name.toLowerCase()))
    .get();
  return row?.data as unknown as DBUser | undefined;
}
export async function isNameAvailable(
  name: string,
  uid: string,
): Promise<boolean> {
  const user = await findByName(name);
  return !user || user.uid === uid;
}
export async function getUserByName(
  name: string,
  stack: string,
): Promise<DBUser> {
  const user = await findByName(name);
  if (!user) throw new MonkeyError(404, "User not found", stack);
  return user;
}
export async function isDiscordIdAvailable(
  discordId: string,
): Promise<boolean> {
  return !(await database()
    .select({ uid: users.uid })
    .from(users)
    .where(eq(users.discordId, discordId))
    .get());
}
export async function addResultFilterPreset(
  uid: string,
  resultFilter: ResultFilters,
  maxFiltersPerUser: number,
): Promise<StoredId> {
  const id = newId();
  await mutateUser(uid, (user) => {
    if ((user.resultFilterPresets?.length ?? 0) >= maxFiltersPerUser) {
      throw new MonkeyError(409, "Maximum number of custom filters reached");
    }
    (user.resultFilterPresets ??= []).push({ ...resultFilter, _id: id });
  });
  return id;
}
export async function removeResultFilterPreset(
  uid: string,
  id: string,
): Promise<void> {
  await mutateUser(uid, (user) => {
    if (!user.resultFilterPresets?.some((item) => item._id.toString() === id)) {
      throw new MonkeyError(404, "Custom filter not found");
    }
    user.resultFilterPresets = user.resultFilterPresets.filter(
      (item) => item._id.toString() !== id,
    );
  });
}
export async function addTag(uid: string, name: string): Promise<DBUserTag> {
  const tag = { _id: newId(), name, personalBests: emptyPb() };
  await mutateUser(uid, (user) => {
    if ((user.tags?.length ?? 0) >= 15) {
      throw new MonkeyError(400, "Maximum number of tags reached");
    }
    (user.tags ??= []).push(tag);
  });
  return tag;
}
export async function getTags(uid: string): Promise<DBUserTag[]> {
  return (await getUser(uid, "get tags")).tags ?? [];
}
function tagById(user: DBUser, id: string): DBUserTag {
  const tag = user.tags?.find((item) => item._id.toString() === id);
  if (!tag) throw new MonkeyError(404, "Tag not found");
  return tag;
}
export async function editTag(
  uid: string,
  id: string,
  name: string,
): Promise<void> {
  await mutateUser(uid, (user) => {
    tagById(user, id).name = name;
  });
}
export async function removeTag(uid: string, id: string): Promise<void> {
  await mutateUser(uid, (user) => {
    tagById(user, id);
    user.tags = user.tags?.filter((item) => item._id.toString() !== id);
  });
}
export async function removeTagPb(uid: string, id: string): Promise<void> {
  await mutateUser(uid, (user) => {
    tagById(user, id).personalBests = emptyPb();
  });
}
export async function updateLbMemory(
  uid: string,
  mode: Mode,
  mode2: Mode2<Mode>,
  language: string,
  rank: number,
): Promise<void> {
  await mutateUser(uid, (user) => {
    user.lbMemory ??= {};
    user.lbMemory[mode] ??= {};
    user.lbMemory[mode][mode2] ??= {};
    user.lbMemory[mode][mode2][language] = rank;
  });
}
function pbEligible(result: Result): boolean {
  return (
    canFunboxGetPb(result) &&
    !(
      "stopOnLetter" in result &&
      result.stopOnLetter === true &&
      result.acc < 100
    ) &&
    result.mode !== "quote"
  );
}
export async function checkIfPb(
  uid: string,
  _user: Pick<DBUser, "personalBests" | "lbPersonalBests">,
  result: Result,
): Promise<boolean> {
  if (!pbEligible(result)) return false;
  return await mutateUser(uid, async (user) => {
    const pb = checkAndUpdatePb(
      user.personalBests ?? emptyPb(),
      user.lbPersonalBests ?? { time: {} },
      result,
    );
    user.personalBests = pb.personalBests;
    user.lbPersonalBests = pb.lbPersonalBests;
    const duration = Number(result.mode2),
      language = result.language ?? "english";
    const best = user.lbPersonalBests?.time[duration]?.[language];
    if (result.mode === "time" && best !== undefined) {
      await stage(
        statement(
          "INSERT INTO leaderboard_bests(uid,board,wpm,acc,timestamp,data) VALUES(?,?,?,?,?,?) ON CONFLICT(uid,board) DO UPDATE SET wpm=excluded.wpm,acc=excluded.acc,timestamp=excluded.timestamp,data=excluded.data",
          uid,
          `${language}_time_${duration}`,
          best.wpm,
          best.acc,
          best.timestamp,
          encode(best),
        ),
      );
    }
    return pb.isPb;
  });
}
export async function checkIfTagPb(
  uid: string,
  _user: Pick<DBUser, "tags">,
  result: Result,
): Promise<string[]> {
  if (!pbEligible(result)) return [];
  return await mutateUser(uid, (user) => {
    const updated: string[] = [];
    for (const tag of user.tags ?? []) {
      if (!result.tags?.includes(tag._id.toString())) continue;
      const pb = checkAndUpdatePb(
        tag.personalBests ?? emptyPb(),
        undefined,
        result,
      );
      if (pb.isPb) {
        tag.personalBests = pb.personalBests;
        updated.push(tag._id.toString());
      }
    }
    return updated;
  });
}
export async function resetPb(uid: string): Promise<void> {
  await clearPb(uid);
}
export async function updateLastHashes(
  uid: string,
  lastHashes: string[],
): Promise<void> {
  await mutateUser(uid, (user) => {
    user.lastReultHashes = lastHashes;
  });
}
export async function updateTypingStats(
  uid: string,
  restartCount: number,
  timeTyping: number,
): Promise<void> {
  await mutateUser(uid, (user) => {
    user.startedTests = (user.startedTests ?? 0) + restartCount + 1;
    user.completedTests = (user.completedTests ?? 0) + 1;
    user.timeTyping = (user.timeTyping ?? 0) + timeTyping;
  });
}
export async function linkDiscord(
  uid: string,
  discordId: string,
  discordAvatar?: string,
): Promise<void> {
  await mutateUser(uid, (user) => {
    user.discordId = discordId;
    if (discordAvatar !== undefined) user.discordAvatar = discordAvatar;
  });
}
export async function unlinkDiscord(uid: string): Promise<void> {
  await mutateUser(uid, (user) => {
    delete user.discordId;
    delete user.discordAvatar;
  });
}
export async function incrementBananas(
  uid: string,
  wpm: number,
): Promise<void> {
  await mutateUser(uid, (user) => {
    const pbs = user.personalBests?.time[60];
    if (
      pbs !== undefined &&
      pbs.length > 0 &&
      wpm >= Math.max(...pbs.map((pb) => pb.wpm)) * 0.75
    ) {
      user.bananas = (user.bananas ?? 0) + 1;
    }
  });
}
export async function incrementXp(uid: string, xp: number): Promise<void> {
  await mutateUser(uid, (user) => {
    user.xp = (user.xp ?? 0) + (Number.isFinite(xp) ? Math.trunc(xp) : 0);
  });
}
export async function incrementTestActivity(
  user: DBUser,
  timestamp: number,
): Promise<void> {
  if (user.testActivity === undefined) return;
  await mutateUser(user.uid, async (current) => {
    const date = new UTCDate(timestamp),
      year = date.getFullYear(),
      index = getDayOfYear(date) - 1;
    current.testActivity ??= {};
    const days = (current.testActivity[year] ??= []);
    while (days.length <= index) days.push(0);
    days[index] = (days[index] ?? 0) + 1;
    await stage(
      statement(
        "INSERT INTO user_activity(uid,day,count) VALUES(?,?,1) ON CONFLICT(uid,day) DO UPDATE SET count=count+1",
        user.uid,
        Math.floor(timestamp / 86400000),
      ),
    );
  });
}
export type DBCustomTheme = WithObjectId<CustomTheme>;
export async function addTheme(
  uid: string,
  { name, colors }: Omit<CustomTheme, "_id">,
): Promise<{ _id: StoredId; name: string }> {
  const theme = { _id: newId(), name, colors };
  await mutateUser(uid, (user) => {
    if ((user.customThemes?.length ?? 0) >= 20) {
      throw new MonkeyError(409, "Maximum number of custom themes reached");
    }
    (user.customThemes ??= []).push(theme);
  });
  return { _id: theme._id, name };
}
function themeById(user: DBUser, id: string): DBCustomTheme {
  const theme = user.customThemes?.find((item) => item._id.toString() === id);
  if (!theme) throw new MonkeyError(404, "Custom theme not found");
  return theme;
}
export async function removeTheme(uid: string, id: string): Promise<void> {
  await mutateUser(uid, (user) => {
    themeById(user, id);
    user.customThemes = user.customThemes?.filter(
      (item) => item._id.toString() !== id,
    );
  });
}
export async function editTheme(
  uid: string,
  id: string,
  { name, colors }: Omit<CustomTheme, "_id">,
): Promise<void> {
  await mutateUser(uid, (user) => {
    Object.assign(themeById(user, id), { name, colors });
  });
}
export async function getThemes(uid: string): Promise<DBCustomTheme[]> {
  return (await getUser(uid, "get themes")).customThemes ?? [];
}
export async function getPersonalBests(
  uid: string,
  mode: string,
  mode2?: string,
): Promise<PersonalBest> {
  const user = await getUser(uid, "get personal bests");
  return (mode2 === undefined
    ? (user.personalBests as Record<string, Record<string, PersonalBest[]>>)[
        mode
      ]
    : (user.personalBests as Record<string, Record<string, PersonalBest[]>>)[
        mode
      ]?.[mode2]) as unknown as PersonalBest;
}
export async function getStats(
  uid: string,
): Promise<Pick<DBUser, "startedTests" | "completedTests" | "timeTyping">> {
  return await getPartialUser(uid, "get stats", [
    "startedTests",
    "completedTests",
    "timeTyping",
  ]);
}
export async function getFavoriteQuotes(
  uid: string,
): Promise<NonNullable<DBUser["favoriteQuotes"]>> {
  return (await getUser(uid, "get favorite quotes")).favoriteQuotes ?? {};
}
export async function addFavoriteQuote(
  uid: string,
  language: string,
  quoteId: string,
  maxQuotes: number,
): Promise<void> {
  await mutateUser(uid, (user) => {
    const favorites = (user.favoriteQuotes ??= {});
    if (
      Object.values(favorites).reduce(
        (sum, quotes) => sum + quotes.length,
        0,
      ) >= maxQuotes
    ) {
      throw new MonkeyError(409, "Maximum number of favorite quotes reached");
    }
    const quotes = ((favorites as Record<string, string[]>)[language] ??= []);
    if (!quotes.includes(quoteId)) quotes.push(quoteId);
  });
}
export async function removeFavoriteQuote(
  uid: string,
  language: string,
  quoteId: string,
): Promise<void> {
  await mutateUser(uid, (user) => {
    if (
      user.favoriteQuotes !== undefined &&
      (user.favoriteQuotes as Record<string, string[]>)[language] !== undefined
    ) {
      (user.favoriteQuotes as Record<string, string[]>)[language] = (
        (user.favoriteQuotes as Record<string, string[]>)[language] ?? []
      ).filter((id) => id !== quoteId);
    }
  });
}
export async function recordAutoBanEvent(
  uid: string,
  maxCount: number,
  maxHours: number,
): Promise<boolean> {
  return await mutateUser(uid, async (user) => {
    if (user.banned) return false;
    const now = Date.now();
    user.autoBanTimestamps = (user.autoBanTimestamps ?? []).filter(
      (timestamp) => timestamp >= now - maxHours * 3600000,
    );
    user.autoBanTimestamps.push(now);
    const banned = user.autoBanTimestamps.length > maxCount;
    if (banned) user.banned = true;
    await addImportantLog(
      "user_auto_banned",
      { autoBanTimestamps: user.autoBanTimestamps, banningUser: banned },
      uid,
    );
    if (banned && user.discordId !== undefined && user.discordId !== "") {
      await GeorgeQueue.userBanned(user.discordId, true);
    }
    return banned;
  });
}
export async function updateProfile(
  uid: string,
  updates: Partial<UserProfileDetails>,
  inventory?: UserInventory,
): Promise<void> {
  await mutateUser(uid, (user) => {
    const current = (user.profileDetails ??= {
      bio: "",
      keyboard: "",
      socialProfiles: {},
    });
    if (updates.bio !== undefined) current.bio = updates.bio;
    if (updates.keyboard !== undefined) current.keyboard = updates.keyboard;
    if (updates.socialProfiles) {
      current.socialProfiles = {
        ...current.socialProfiles,
        ...updates.socialProfiles,
      };
    }
    if (inventory !== undefined) user.inventory = inventory;
  });
}
export async function getInbox(uid: string): Promise<MonkeyMail[]> {
  await getUser(uid, "get inbox");
  return await readInbox(uid);
}
async function readInbox(uid: string): Promise<MonkeyMail[]> {
  const rows = await database()
    .select()
    .from(inbox)
    .where(and(eq(inbox.uid, uid), eq(inbox.deleted, false)))
    .orderBy(desc(inbox.timestamp));
  return rows.map(
    (row) =>
      ({
        ...row.data,
        id: row.id,
        read: row.read,
        rewards: row.read ? [] : row.data["rewards"],
      }) as MonkeyMail,
  );
}
type AddToInboxBulkEntry = { uid: string; mail: MonkeyMail[] };
export async function addToInboxBulk(
  entries: AddToInboxBulkEntry[],
  config: Configuration["users"]["inbox"],
): Promise<void> {
  for (const batch of chunks(entries, 10)) {
    await Promise.all(
      batch.map(
        async (entry) => await addToInbox(entry.uid, entry.mail, config),
      ),
    );
  }
}
export async function addToInbox(
  uid: string,
  mail: MonkeyMail[],
  config: Configuration["users"]["inbox"],
): Promise<void> {
  if (!config.enabled) return;
  await mutateUser(uid, async () => {
    for (const item of mail) {
      await stage(
        statement(
          "INSERT INTO inbox(id,uid,timestamp,read,data) VALUES(?,?,?,?,?) ON CONFLICT(uid,id) DO NOTHING",
          item.id,
          uid,
          item.timestamp,
          Number(item.read),
          encode(item),
        ),
      );
      await stage(
        statement(
          "INSERT INTO reward_grants(id,uid,origin,claimed,data) VALUES(?,?,?,?,?) ON CONFLICT(origin,uid) DO NOTHING",
          `${uid}:${item.id}`,
          uid,
          item.id,
          Number(item.read),
          encode({ rewards: item.rewards }),
        ),
      );
    }
    await stage(
      statement(
        "DELETE FROM inbox WHERE uid=? AND id NOT IN (SELECT id FROM inbox WHERE uid=? ORDER BY timestamp DESC,id DESC LIMIT ?)",
        uid,
        uid,
        config.maxMail,
      ),
    );
  });
}
export async function updateInbox(
  uid: string,
  mailToRead: string[],
  mailToDelete: string[],
): Promise<void> {
  const ids = [...new Set([...mailToRead, ...mailToDelete])];
  if (!ids.length) return;
  await mutateUser(uid, async (user) => {
    const mails = await database()
      .select()
      .from(inbox)
      .where(
        and(
          eq(inbox.uid, uid),
          inArray(inbox.id, ids),
          eq(inbox.deleted, false),
        ),
      );
    const grants = await database()
      .select()
      .from(rewardGrants)
      .where(
        and(
          eq(rewardGrants.uid, uid),
          inArray(
            rewardGrants.origin,
            mails.map((mail) => mail.id),
          ),
          eq(rewardGrants.claimed, false),
        ),
      );
    const badges: Badge[] = [...(user.inventory?.badges ?? [])];
    for (const grant of grants) {
      const rewards = (grant.data["rewards"] ?? []) as MonkeyMail["rewards"];
      for (const reward of rewards) {
        if (reward.type === "xp") {
          user.xp = (user.xp ?? 0) + reward.item;
        } else if (
          reward.type === "badge" &&
          !badges.some((badge) => badge.id === reward.item.id)
        ) {
          badges.push(reward.item);
        }
      }
      await stage(
        statement(
          "UPDATE reward_grants SET claimed=1 WHERE id=? AND uid=?",
          grant.id,
          uid,
        ),
      );
    }
    user.inventory = { ...user.inventory, badges };
    for (const mail of mails) {
      await stage(
        statement(
          "UPDATE inbox SET read=1,deleted=? WHERE id=? AND uid=?",
          Number(mailToDelete.includes(mail.id)),
          mail.id,
          uid,
        ),
      );
    }
  });
}
export async function updateStreak(
  uid: string,
  timestamp: number,
): Promise<number> {
  return await mutateUser(uid, async (user) => {
    const streak: UserStreak = {
      lastResultTimestamp: user.streak?.lastResultTimestamp ?? 0,
      length: user.streak?.length ?? 0,
      maxLength: user.streak?.maxLength ?? 0,
      hourOffset: user.streak?.hourOffset,
    };
    if (isYesterday(streak.lastResultTimestamp, streak.hourOffset ?? 0)) {
      streak.length++;
    } else if (!isToday(streak.lastResultTimestamp, streak.hourOffset ?? 0)) {
      await addImportantLog("streak_lost", streak, uid);
      streak.length = 1;
    }
    streak.maxLength = Math.max(streak.length, streak.maxLength);
    streak.lastResultTimestamp = timestamp;
    if (streak.hourOffset === 0) delete streak.hourOffset;
    user.streak = streak;
    return streak.length;
  });
}
export async function setStreakHourOffset(
  uid: string,
  hourOffset: number,
): Promise<void> {
  await mutateUser(uid, (user) => {
    user.streak ??= { length: 0, maxLength: 0, lastResultTimestamp: 0 };
    user.streak.hourOffset = hourOffset;
    user.streak.lastResultTimestamp = Date.now();
  });
}
export async function setBanned(uid: string, banned: boolean): Promise<void> {
  await mutateUser(uid, (user) => {
    if (banned) user.banned = true;
    else delete user.banned;
  });
}
export async function clearStreakHourOffset(uid: string): Promise<void> {
  await mutateUser(uid, (user) => {
    if (user.streak) delete user.streak.hourOffset;
  });
}
export async function checkIfUserIsPremium(
  uid: string,
  override?: Pick<DBUser, "premium">,
): Promise<boolean> {
  if (!(await getCachedConfiguration(true)).users.premium.enabled) return false;
  const premium = (override ?? (await getUser(uid, "check premium"))).premium;
  return (
    premium?.expirationTimestamp === -1 ||
    (premium?.expirationTimestamp ?? 0) > Date.now()
  );
}
export async function logIpAddress(
  uid: string,
  ip: string,
  _override?: Pick<DBUser, "ips">,
): Promise<void> {
  await mutateUser(uid, (user) => {
    user.ips = [
      ip,
      ...(user.ips ?? []).filter((existing) => existing !== ip),
    ].slice(0, 10);
  });
}
export async function getFriends(uid: string): Promise<DBFriend[]> {
  const edges = await database()
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.status, "accepted"),
        inArray(
          connections.id,
          (
            await statement(
              "SELECT id FROM connections WHERE initiator_uid=? OR receiver_uid=?",
              uid,
              uid,
            ).all<{ id: string }>()
          ).results.map((edge) => edge.id),
        ),
      ),
    );
  const friends: DBFriend[] = [];
  for (const friendUid of [
    ...new Set([
      uid,
      ...edges.map((edge) =>
        edge.initiatorUid === uid ? edge.receiverUid : edge.initiatorUid,
      ),
    ]),
  ]) {
    const user = await getUser(friendUid, "get friends");
    const edge = edges.find(
      (item) =>
        item.initiatorUid === friendUid || item.receiverUid === friendUid,
    );
    const best = (duration: number): PersonalBest | undefined =>
      user.personalBests.time[duration]?.reduce<PersonalBest | undefined>(
        (top, pb) => (!top || pb.wpm >= top.wpm ? pb : top),
        undefined,
      );
    friends.push({
      uid: user.uid,
      name: user.name,
      discordId: user.discordId,
      discordAvatar: user.discordAvatar,
      startedTests: user.startedTests,
      completedTests: user.completedTests,
      timeTyping: user.timeTyping,
      xp: user.xp,
      banned: user.banned,
      lbOptOut: user.lbOptOut,
      streak:
        user.streak === undefined
          ? undefined
          : { length: user.streak.length, maxLength: user.streak.maxLength },
      connectionId: friendUid === uid ? undefined : edge?.id,
      lastModified: friendUid === uid ? undefined : edge?.lastModified,
      top15: best(15),
      top60: best(60),
      badgeId: user.inventory?.badges?.find((badge) => badge.selected)?.id,
      isPremium:
        user.premium?.expirationTimestamp === -1 ||
        (user.premium?.expirationTimestamp ?? 0) > Date.now(),
    });
  }
  return friends;
}
