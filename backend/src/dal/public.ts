import { eq } from "drizzle-orm";
import { roundTo2 } from "@oxytype/util/numbers";
import { database, statement } from "../db/client";
import { stage } from "../db/mutation";
import { publicStats, speedHistograms } from "../db/schema";
import type { TypingStats, SpeedHistogram } from "@oxytype/schemas/public";
export type PublicTypingStatsDB = TypingStats & { _id: "stats" };
export type PublicSpeedStatsDB = {
  _id: "speedStatsHistogram";
  english_time_15: SpeedHistogram;
  english_time_60: SpeedHistogram;
};
export async function updateStats(
  restartCount: number,
  time: number,
): Promise<boolean> {
  await stage(
    statement(
      "INSERT INTO public_stats(id,tests_completed,tests_started,time_typing) VALUES('stats',1,?,?) ON CONFLICT(id) DO UPDATE SET tests_completed=tests_completed+1,tests_started=tests_started+excluded.tests_started,time_typing=time_typing+excluded.time_typing",
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
): Promise<SpeedHistogram> {
  const rows = await database()
    .select()
    .from(speedHistograms)
    .where(eq(speedHistograms.board, `${language}_${mode}_${mode2}`));
  return Object.fromEntries(rows.map((row) => [row.bucket, row.count]));
}
export async function getTypingStats(): Promise<PublicTypingStatsDB> {
  const row = await database()
    .select()
    .from(publicStats)
    .where(eq(publicStats.id, "stats"))
    .get();
  return {
    _id: "stats",
    testsCompleted: row?.testsCompleted ?? 0,
    testsStarted: row?.testsStarted ?? 0,
    timeTyping: row?.timeTyping ?? 0,
  };
}
