import * as LeaderboardsDAL from "../dal/leaderboards";
import { getCachedConfiguration } from "../init/configuration";

export async function updateLeaderboards(): Promise<void> {
  const { maintenance } = await getCachedConfiguration();
  if (maintenance) return;

  for (const client of ["web", "tui"] as const) {
    await LeaderboardsDAL.update("time", "60", "english", client);
    await LeaderboardsDAL.update("time", "15", "english", client);
  }
}
