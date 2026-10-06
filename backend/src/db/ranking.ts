import { statement } from "./client";
export type RankingRow = {
  uid: string;
  data: string;
  rank: number;
  score: number;
  timeTypedSeconds?: number;
};
/** Table names are a closed union; all caller data uses bound parameters. */
function rankingQuery(
  table: "daily_entries" | "weekly_entries",
  period: number,
  board?: string,
  includeExpired = false,
): { query: string; values: (string | number)[] } {
  const score = table === "daily_entries" ? "score" : "xp";
  const values: (string | number)[] = [period, includeExpired ? 0 : Date.now()];
  if (board !== undefined) values.push(board);
  return {
    query: `WITH ranked AS (SELECT uid,data,${score} AS score,${table === "weekly_entries" ? "time_typed_seconds AS timeTypedSeconds," : ""}row_number() OVER(ORDER BY ${score} DESC,uid DESC) AS rank FROM ${table} WHERE period=? AND expires_at>? ${board === undefined ? "" : "AND board=?"})`,
    values,
  };
}
export async function rankingPage(
  table: "daily_entries" | "weekly_entries",
  period: number,
  page: number,
  pageSize: number,
  board?: string,
  includeExpired = false,
): Promise<{ rows: RankingRow[]; count: number; minWpm: number }> {
  if (page < 0 || pageSize < 0) throw new Error("Invalid page or pageSize");
  const { query, values } = rankingQuery(table, period, board, includeExpired);
  // Totals need filtering only; avoid ranking every row a second time.
  const [rows, summary] = await Promise.all([
    statement(
      `${query} SELECT * FROM ranked ORDER BY rank LIMIT ? OFFSET ?`,
      ...values,
      Math.min(pageSize, 1000),
      page * pageSize,
    ).all<RankingRow>(),
    statement(
      `SELECT count(*) AS count,coalesce(min(json_extract(data,'$.wpm')),0) AS minWpm FROM ${table} WHERE period=? AND expires_at>? ${board === undefined ? "" : "AND board=?"}`,
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
): Promise<RankingRow | null> {
  const score = table === "daily_entries" ? "score" : "xp";
  const scope = `period=? AND expires_at>? ${board === undefined ? "" : "AND board=?"}`;
  const scopeValues: (string | number)[] = [period, Date.now()];
  if (board !== undefined) scopeValues.push(board);
  // Read one profile, then count higher scores using the ranking index.
  const ahead = `SELECT count(*) FROM ${table} WHERE ${scope} AND (${score},uid)>(me.score,me.uid)`;
  return await statement(
    `WITH me AS (SELECT uid,data,${score} AS score${table === "weekly_entries" ? ",time_typed_seconds AS timeTypedSeconds" : ""} FROM ${table} WHERE ${scope} AND uid=?) SELECT me.*,(1+(${ahead})) AS rank FROM me`,
    ...scopeValues,
    uid,
    ...scopeValues,
  ).first<RankingRow>();
}
