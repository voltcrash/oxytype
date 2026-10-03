import { z } from "zod/v3";
import type { ImportRow } from "./mongo-mapping";
const Snapshot = z.array(
  z.object({
    key: z.string(),
    type: z.string(),
    value: z.unknown(),
    expiresAt: z.number().nullable(),
  }),
);
const Hash = z.record(z.string());
const List = z.array(z.string());
const Entry = z
  .object({ uid: z.string(), timeTypedSeconds: z.number().optional() })
  .passthrough();
const Task = z.discriminatedUnion("taskName", [
  z.object({
    taskName: z.literal("daily-leaderboard-results"),
    ctx: z.object({
      yesterdayTimestamp: z.number(),
      modeRule: z.object({
        language: z.string(),
        mode: z.string(),
        mode2: z.string(),
      }),
    }),
  }),
  z.object({
    taskName: z.literal("weekly-xp-leaderboard-results"),
    ctx: z.object({ lastWeekTimestamp: z.number() }),
  }),
]);
export function mapRedisSnapshot(input: unknown): {
  rows: ImportRow[];
  discardedDiscordJobs: number;
  archivedKeys: number;
} {
  const snapshot = Snapshot.parse(input),
    keys = new Map(snapshot.map((entry) => [entry.key, entry]));
  const rows: ImportRow[] = [];
  for (const item of snapshot) {
    const daily = /^oxytype:dailyleaderboard:scores:(.+):(\d+)$/.exec(item.key),
      weekly = /^oxytype:weekly-xp-leaderboard:scores:(\d+)$/.exec(item.key);
    if (daily === null && weekly === null) continue;
    const resultsKey = item.key.replace(":scores:", ":results:"),
      resultItem = keys.get(resultsKey);
    if (resultItem === undefined) {
      throw new Error("Leaderboard result hash missing");
    }
    const data = Hash.parse(resultItem.value),
      scores = List.parse(item.value);
    for (let i = 0; i < scores.length; i += 2) {
      const uid = scores[i],
        score = Number(scores[i + 1]);
      if (
        uid === undefined ||
        !Number.isSafeInteger(score) ||
        data[uid] === undefined
      ) {
        throw new Error("Incomplete/unsafe Redis score");
      }
      const entry = Entry.parse(JSON.parse(data[uid]));
      delete entry["discordId"];
      delete entry["discordAvatar"];
      if (entry.uid !== uid) throw new Error("Redis entry identity mismatch");
      const expiresAt = item.expiresAt ?? 9_000_000_000_000;
      rows.push(
        daily !== null
          ? {
              table: "daily_entries",
              key: ["board", "period", "uid"],
              values: {
                board: daily[1] ?? "",
                period: Number(daily[2]),
                uid,
                score,
                expires_at: expiresAt,
                data: JSON.stringify(entry),
              },
            }
          : {
              table: "weekly_entries",
              key: ["period", "uid"],
              values: {
                period: Number(weekly?.[1]),
                uid,
                xp: score,
                time_typed_seconds: entry.timeTypedSeconds ?? 0,
                expires_at: expiresAt,
                data: JSON.stringify(entry),
              },
            },
      );
    }
  }
  const active = keys.get("bull:later:active");
  if (active !== undefined && List.parse(active.value).length > 0) {
    throw new Error(
      "Drain active Bull jobs before migration; partial jobs cannot be replayed safely",
    );
  }
  let discardedDiscordJobs = 0;
  for (const queue of ["later", "george-tasks"]) {
    const pending = new Set<string>();
    const states = ["wait", "paused", "delayed", "prioritized"];
    if (queue === "george-tasks") states.push("active");
    for (const state of states) {
      const item = keys.get(`bull:${queue}:${state}`);
      if (item === undefined) continue;
      const values = List.parse(item.value);
      const ids =
        item.type === "zset" ? values.filter((_, i) => i % 2 === 0) : values;
      ids.forEach((id) => pending.add(id));
    }
    for (const id of pending) {
      if (queue === "george-tasks") {
        discardedDiscordJobs++;
        continue;
      }
      const item = keys.get(`bull:later:${id}`);
      if (item === undefined) {
        throw new Error("Pending Bull job payload missing");
      }
      const fields = Hash.parse(item.value);
      if (fields["data"] === undefined) {
        throw new Error("Bull job data missing");
      }
      if (Number(fields["atm"] ?? fields["attemptsMade"] ?? 0) > 0) {
        throw new Error(
          "Previously attempted payout job requires manual reconciliation before replay",
        );
      }
      const task = Task.parse(JSON.parse(fields["data"]));
      const due =
        Number(fields["timestamp"] ?? 0) + Number(fields["delay"] ?? 0);
      if (!Number.isSafeInteger(due)) throw new Error("Invalid Bull due time");
      rows.push({
        table: "scheduled_jobs",
        key: ["id"],
        values: {
          id,
          type: task.taskName,
          due_at: due,
          data: JSON.stringify(task),
        },
      });
    }
  }
  return { rows, discardedDiscordJobs, archivedKeys: snapshot.length };
}
