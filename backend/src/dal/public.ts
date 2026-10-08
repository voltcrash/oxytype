import { clientBoard } from "../db/client-profile";
import type { Client } from "@oxytype/schemas/shared";
import { eq } from "drizzle-orm";
import { roundTo2 } from "@oxytype/util/numbers";
import { database, statement } from "../db/client";
import { stage } from "../db/mutation";
import { publicStats, speedHistograms } from "../db/schema";
import type { TypingStats, SpeedHistogram } from "@oxytype/schemas/public";
export type PublicTypingStatsDB = TypingStats & { _id: "stats" };
export async function updateStats(
  restartCount: number,
  time: number,
  client: Client = "web",
): Promise<boolean> {
  await stage(
    statement(
      "INSERT INTO public_stats(id,tests_completed,tests_started,time_typing) VALUES(?,1,?,?) ON CONFLICT(id) DO UPDATE SET tests_completed=tests_completed+1,tests_started=tests_started+excluded.tests_started,time_typing=time_typing+excluded.time_typing",
      client === "web" ? "stats" : "stats:tui",
      restartCount + 1,
      roundTo2(time),
    ),
  );
  return true;
}
export async function getSpeedHistogram(
  language: string,
  mode: string,
  mode2: string,
  client: Client = "web",
): Promise<SpeedHistogram> {
  const rows = await database()
    .select()
    .from(speedHistograms)
    .where(
      eq(
        speedHistograms.board,
        clientBoard(`${language}_${mode}_${mode2}`, client),
      ),
    );
  return Object.fromEntries(rows.map((row) => [row.bucket, row.count]));
}
export async function getTypingStats(
  client: Client = "web",
): Promise<PublicTypingStatsDB> {
  const row = await database()
    .select()
    .from(publicStats)
    .where(eq(publicStats.id, client === "web" ? "stats" : "stats:tui"))
    .get();
  return {
    _id: "stats",
    testsCompleted: row?.testsCompleted ?? 0,
    testsStarted: row?.testsStarted ?? 0,
    timeTyping: row?.timeTyping ?? 0,
  };
}
