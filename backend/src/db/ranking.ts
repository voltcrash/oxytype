import { statement, encode } from "./client";
export type RankingRow = {
  uid: string;
  data: string;
  rank: number;
  friendsRank?: number;
  score: number;
  timeTypedSeconds?: number;
};
/** Table names are a closed union; all caller data uses bound parameters. */
export function rankingQuery(
  table: "daily_entries" | "weekly_entries",
  period: number,
  board?: string,
  userIds?: string[],
  includeExpired = false,
): { query: string; values: (string | number)[] } {
  const score = table === "daily_entries" ? "score" : "xp";
  const values: (string | number)[] = [period, includeExpired ? 0 : Date.now()];
  if (board !== undefined) values.push(board);
  if (userIds !== undefined) values.push(encode(userIds));
  return {
    query: `WITH ranked AS (SELECT uid,data,${score} AS score,${table === "weekly_entries" ? "time_typed_seconds AS timeTypedSeconds," : ""}row_number() OVER(ORDER BY ${score} DESC,uid DESC) AS rank FROM ${table} WHERE period=? AND expires_at>? ${board === undefined ? "" : "AND board=?"}), filtered AS (SELECT *${userIds === undefined ? "" : ",row_number() OVER(ORDER BY rank) AS friendsRank"} FROM ranked ${userIds === undefined ? "" : "WHERE uid IN (SELECT value FROM json_each(?))"})`,
    values,
  };
}
export async function rankingPage(
  table: "daily_entries" | "weekly_entries",
  period: number,
  page: number,
  pageSize: number,
  board?: string,
  userIds?: string[],
  includeExpired = false,
): Promise<{ rows: RankingRow[]; count: number; minWpm: number }> {
  if (page < 0 || pageSize < 0) throw new Error("Invalid page or pageSize");
  const { query, values } = rankingQuery(
    table,
    period,
    board,
    userIds,
    includeExpired,
  );
  // Totals need filtering only; avoid ranking every row a second time.
  const [rows, summary] = await Promise.all([
    statement(
      `${query} SELECT * FROM filtered ORDER BY rank LIMIT ? OFFSET ?`,
      ...values,
      Math.min(pageSize, 1000),
      page * pageSize,
    ).all<RankingRow>(),
    statement(
      `SELECT count(*) AS count,coalesce(min(json_extract(data,'$.wpm')),0) AS minWpm FROM ${table} WHERE period=? AND expires_at>? ${board === undefined ? "" : "AND board=?"} ${userIds === undefined ? "" : "AND uid IN (SELECT value FROM json_each(?))"}`,
      ...values,
    ).first<{ count: number; minWpm: number }>(),
  ]);
  return {
    rows: rows.results,
    count: summary?.count ?? 0,
    minWpm: summary?.minWpm ?? 0,
  };
}
export async function rankingUser(
  table: "daily_entries" | "weekly_entries",
  period: number,
  uid: string,
  board?: string,
  userIds?: string[],
): Promise<RankingRow | null> {
  const score = table === "daily_entries" ? "score" : "xp";
  const scope = `period=? AND expires_at>? ${board === undefined ? "" : "AND board=?"}`;
  const scopeValues: (string | number)[] = [period, Date.now()];
  if (board !== undefined) scopeValues.push(board);
  const friends =
    userIds === undefined ? "" : "AND uid IN (SELECT value FROM json_each(?))";
  const friendValues = userIds === undefined ? [] : [encode(userIds)];
  // Read one profile, then count higher scores using the ranking index.
  const ahead = `SELECT count(*) FROM ${table} WHERE ${scope} AND (${score},uid)>(me.score,me.uid)`;
  return await statement(
    `WITH me AS (SELECT uid,data,${score} AS score${table === "weekly_entries" ? ",time_typed_seconds AS timeTypedSeconds" : ""} FROM ${table} WHERE ${scope} AND uid=? ${friends}) SELECT me.*,(1+(${ahead})) AS rank${userIds === undefined ? "" : `,(1+(${ahead} ${friends})) AS friendsRank`} FROM me`,
    ...scopeValues,
    uid,
    ...friendValues,
    ...scopeValues,
    ...(userIds === undefined ? [] : [...scopeValues, ...friendValues]),
  ).first<RankingRow>();
}
