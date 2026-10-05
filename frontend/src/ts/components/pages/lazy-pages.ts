import { lazy } from "solid-js";
import { PageName } from "../../pages/page";

export const lazyPages = {
  about: lazy(async () =>
    import("./AboutPage").then((m) => ({ default: m.AboutPage })),
  ),
  settings: lazy(async () =>
    import("./settings/SettingsPage").then((m) => ({
      default: m.SettingsPage,
    })),
  ),
  account: lazy(async () =>
    import("./account/AccountPage").then((m) => ({ default: m.AccountPage })),
  ),
  login: lazy(async () =>
    import("./login/LoginPage").then((m) => ({ default: m.LoginPage })),
  ),
  profile: lazy(async () =>
    import("./profile/ProfilePage").then((m) => ({ default: m.ProfilePage })),
  ),
  profileSearch: lazy(async () =>
    import("./profile/ProfileSearchPage").then((m) => ({
      default: m.ProfileSearchPage,
    })),
  ),
  "404": lazy(async () =>
    import("./404Page").then((m) => ({ default: m.NotFoundPage })),
  ),
  friends: lazy(async () =>
    import("./connections/FriendsPage").then((m) => ({
      default: m.FriendsPage,
    })),
  ),
  leaderboards: lazy(async () =>
    import("./leaderboard/LeaderboardPage").then((m) => ({
      default: m.LeaderboardPage,
    })),
  ),
};

export async function preloadPage(id: PageName): Promise<void> {
  if (id === "loading" || id === "test") return;
  await lazyPages[id].preload();
}
