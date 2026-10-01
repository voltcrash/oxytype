import { queryClient } from ".";
import {
  getContributorsQueryOptions,
  getSpeedHistogramQueryOptions,
  getTypingStatsQueryOptions,
} from "./public";
import { getLeaderboardQueryOptions } from "./leaderboards";

export function prefetchAboutPage(): void {
  void queryClient.query(getContributorsQueryOptions()).catch(() => undefined);
  void queryClient.query(getTypingStatsQueryOptions()).catch(() => undefined);
  void queryClient
    .query(getSpeedHistogramQueryOptions())
    .catch(() => undefined);
}

export function prefetchLeaderboardPage(): void {
  void queryClient
    .query(
      getLeaderboardQueryOptions({
        type: "allTime",
        mode: "time",
        mode2: "15",
        language: "english",
        friendsOnly: false,
        page: 0,
        previous: false,
      }),
    )
    .catch(() => undefined);
}
