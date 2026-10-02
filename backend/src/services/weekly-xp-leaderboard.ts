import type { Configuration } from "@oxytype/schemas/configuration";
import type {
  RedisXpLeaderboardEntry,
  RedisXpLeaderboardScore,
  XpLeaderboardEntry,
} from "@oxytype/schemas/leaderboards";
import LaterQueue from "../queues/later-queue";
import { getCurrentWeekTimestamp } from "@oxytype/util/date-and-time";
import { statement, encode } from "../db/client";
import { stage } from "../db/mutation";
import { rankingPage, rankingUser, type RankingRow } from "../db/ranking";
import { omit } from "../utils/misc";
export type AddResultOpts = {
  entry: RedisXpLeaderboardEntry;
  xpGained: RedisXpLeaderboardScore;
};
function unpack(row: RankingRow): XpLeaderboardEntry {
  return {
    ...(JSON.parse(row.data) as RedisXpLeaderboardEntry),
    rank: row.rank,
    friendsRank: row.friendsRank,
    totalXp: row.score,
    timeTypedSeconds: row.timeTypedSeconds ?? 0,
  };
}
export class WeeklyXpLeaderboard {
  private readonly customTime: number;
  constructor(customTime = -1) {
    this.customTime = customTime;
  }
  private period(): number {
    return this.customTime === -1 ? getCurrentWeekTimestamp() : this.customTime;
  }
  public async addResult(
    config: Configuration["leaderboards"]["weeklyXp"],
    opts: AddResultOpts,
  ): Promise<number> {
    if (!config.enabled) return -1;
    const { entry, xpGained } = opts,
      period = this.period();
    const previous =
      (await statement(
        "SELECT xp FROM weekly_entries WHERE period=? AND uid=?",
        period,
        entry.uid,
      ).first<number>("xp")) ?? 0;
    await stage(
      statement(
        "INSERT INTO weekly_entries(period,uid,xp,time_typed_seconds,expires_at,data) VALUES(?,?,?,?,?,?) ON CONFLICT(period,uid) DO UPDATE SET xp=xp+excluded.xp,time_typed_seconds=time_typed_seconds+excluded.time_typed_seconds,data=excluded.data",
        period,
        entry.uid,
        xpGained,
        entry.timeTypedSeconds,
        period + config.expirationTimeInDays * 86400000,
        encode(entry),
      ),
    );
    await LaterQueue.scheduleForNextWeek(
      "weekly-xp-leaderboard-results",
      "weekly",
    );
    return (
      ((await statement(
        "SELECT count(*) AS count FROM weekly_entries WHERE period=? AND uid<>? AND (xp>? OR (xp=? AND uid>?))",
        period,
        entry.uid,
        previous + xpGained,
        previous + xpGained,
        entry.uid,
      ).first<number>("count")) ?? 0) + 1
    );
  }
  public async getResults(
    page: number,
    pageSize: number,
    config: Configuration["leaderboards"]["weeklyXp"],
    premium: boolean,
    userIds?: string[],
    includeExpired = false,
  ): Promise<{ entries: XpLeaderboardEntry[]; count: number } | null> {
    if (!config.enabled) return null;
    const result = await rankingPage(
      "weekly_entries",
      this.period(),
      page,
      pageSize,
      undefined,
      userIds,
      includeExpired,
    );
    return {
      entries: result.rows
        .map(unpack)
        .map((entry) => (premium ? entry : omit(entry, ["isPremium"]))),
      count: result.count,
    };
  }
  public async getRank(
    uid: string,
    config: Configuration["leaderboards"]["weeklyXp"],
    userIds?: string[],
  ): Promise<XpLeaderboardEntry | null> {
    if (!config.enabled) return null;
    const row = await rankingUser(
      "weekly_entries",
      this.period(),
      uid,
      undefined,
      userIds,
    );
    return row ? unpack(row) : null;
  }
}
export function get(
  weeklyXpLeaderboardConfig: Configuration["leaderboards"]["weeklyXp"],
  customTimestamp?: number,
): WeeklyXpLeaderboard | null {
  const { enabled } = weeklyXpLeaderboardConfig;

  if (!enabled) {
    return null;
  }

  return new WeeklyXpLeaderboard(customTimestamp);
}

export async function purgeUserFromXpLeaderboards(
  uid: string,
  _config: Configuration["leaderboards"]["weeklyXp"],
): Promise<void> {
  await stage(statement("DELETE FROM weekly_entries WHERE uid=?", uid));
}
