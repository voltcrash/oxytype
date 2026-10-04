import { z } from "zod/v3";

const FriendsRankSchema = z
  .number()
  .nonnegative()
  .int()
  .optional()
  .describe("only available on friendsOnly leaderboard");

export const LeaderboardEntrySchema = z.object({
  wpm: z.number().nonnegative(),
  acc: z.number().nonnegative().min(0).max(100),
  timestamp: z.number().int().nonnegative(),
  raw: z.number().nonnegative(),
  consistency: z.number().nonnegative().optional(),
  uid: z.string(),
  name: z.string(),
  rank: z.number().nonnegative().int(),
  friendsRank: FriendsRankSchema,
  badgeId: z.number().int().optional(),
  isPremium: z.boolean().optional(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const DailyLeaderboardEntrySchema = LeaderboardEntrySchema.omit({
  rank: true,
  friendsRank: true,
});
export type DailyLeaderboardEntry = z.infer<typeof DailyLeaderboardEntrySchema>;

export const RedisXpLeaderboardEntrySchema = z.object({
  uid: z.string(),
  name: z.string(),
  lastActivityTimestamp: z.number().int().nonnegative(),
  timeTypedSeconds: z.number().nonnegative(),
  // optionals
  badgeId: z.number().int().optional(),
  isPremium: z.boolean().optional(),
});
export type RedisXpLeaderboardEntry = z.infer<
  typeof RedisXpLeaderboardEntrySchema
>;

export const RedisXpLeaderboardScoreSchema = z.number().int().nonnegative();
export type RedisXpLeaderboardScore = z.infer<
  typeof RedisXpLeaderboardScoreSchema
>;

export const XpLeaderboardEntrySchema = RedisXpLeaderboardEntrySchema.extend({
  //based on another redis collection
  totalXp: RedisXpLeaderboardScoreSchema,
  // dynamically added when generating response on the backend
  rank: z.number().nonnegative().int(),
  friendsRank: FriendsRankSchema,
});
export type XpLeaderboardEntry = z.infer<typeof XpLeaderboardEntrySchema>;
