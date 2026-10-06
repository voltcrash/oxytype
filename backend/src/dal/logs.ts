import { and, desc, eq, lt } from "drizzle-orm";
import { database, encode, statement } from "../db/client";
import { logs } from "../db/schema";
import { stage } from "../db/mutation";
import { newId } from "../utils/id";
async function insert(
  event: string,
  message: string | Record<string, unknown>,
  uid: string,
  important: boolean,
): Promise<void> {
  console.info(JSON.stringify({ event, uid, message }));
  await stage(
    statement(
      "INSERT INTO audit_logs(id,uid,event,timestamp,important,data) VALUES(?,?,?,?,?,?)",
      newId(),
      uid,
      event,
      Date.now(),
      Number(important),
      encode({ message }),
    ),
  );
}
export async function addLog(
  event: string,
  message: string | Record<string, unknown>,
  uid = "",
): Promise<void> {
  await insert(event, message, uid, false);
}
export async function addImportantLog(
  event: string,
  message: string | Record<string, unknown>,
  uid = "",
): Promise<void> {
  await insert(event, message, uid, true);
}
export async function deleteUserLogs(uid: string): Promise<void> {
  await database().delete(logs).where(eq(logs.uid, uid));
}

export type AuditLog = {
  id: string;
  uid: string;
  event: string;
  timestamp: number;
  message: Record<string, unknown>;
};
function message(data: Record<string, unknown>): Record<string, unknown> {
  const value = data["message"];
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : { value };
}
export async function getLogs(options: {
  event: string;
  uid?: string;
  before?: number;
  limit: number;
}): Promise<AuditLog[]> {
  const rows = await database()
    .select()
    .from(logs)
    .where(
      and(
        eq(logs.event, options.event),
        options.uid === undefined ? undefined : eq(logs.uid, options.uid),
        options.before === undefined
          ? undefined
          : lt(logs.timestamp, options.before),
      ),
    )
    .orderBy(desc(logs.timestamp), desc(logs.id))
    .limit(options.limit);
  return rows.map((row) => ({
    id: row.id,
    uid: row.uid,
    event: row.event,
    timestamp: row.timestamp,
    message: message(row.data),
  }));
}
export type LogCount = { key: string; count: number; users: number };
/** Counts of one event since a timestamp, grouped by a JSON path. */
export async function countLogs(
  event: string,
  since: number,
  path: string,
  array = false,
): Promise<LogCount[]> {
  // array paths hold several keys per log, e.g. every signal of a flag
  const query = array
    ? `SELECT j.value AS key, count(*) AS count, count(DISTINCT l.uid) AS users
       FROM audit_logs l, json_each(l.data, ?) j
       WHERE l.event=? AND l.timestamp>=? GROUP BY j.value ORDER BY count DESC`
    : `SELECT json_extract(data, ?) AS key, count(*) AS count, count(DISTINCT uid) AS users
       FROM audit_logs WHERE event=? AND timestamp>=? GROUP BY key ORDER BY count DESC`;
  const { results } = await statement(query, path, event, since).all<{
    key: string | null;
    count: number;
    users: number;
  }>();
  return results.map((row) => ({ ...row, key: row.key ?? "unknown" }));
}
