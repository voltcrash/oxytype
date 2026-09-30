import { QueryClientProvider } from "@tanstack/solid-query";
import { JSXElement } from "solid-js";
import { render } from "solid-js/web";

import { queryClient } from "../queries";
import { qsa } from "../utils/dom";
import { Advertisement } from "./common/Advertisement";
import { Theme } from "./core/Theme";
import { DevTools } from "./dev/DevTools";
import { CommandlineHotkey } from "./hotkeys/CommandlineHotkey";
import { Footer } from "./layout/footer/Footer";
import { Header } from "./layout/header/Header";
import { Overlays } from "./layout/overlays/Overlays";
import { Modals } from "./modals/Modals";
import { NotFoundPage } from "./pages/404Page";
import { AboutPage } from "./pages/AboutPage";
import { AccountSettingsPage } from "./pages/account-settings/AccountSettingsPage";
import { AccountPage } from "./pages/account/AccountPage";
import { MyProfile } from "./pages/account/MyProfile";
import { FriendsPage } from "./pages/connections/FriendsPage";
import { LeaderboardPage } from "./pages/leaderboard/LeaderboardPage";
import { LoadingPage } from "./pages/LoadingPage";
import { LoginPage } from "./pages/login/LoginPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { ProfileSearchPage } from "./pages/profile/ProfileSearchPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { BarTimerProgress } from "./pages/test/live-stats/BarTimerProgress";
import { MonkeyPower } from "./pages/test/MonkeyPower";
import { TestPage } from "./pages/test/TestPage";
import { Popups } from "./popups/Popups";

const components: Record<string, () => JSXElement> = {
  footer: () => <Footer />,
  aboutpage: () => <AboutPage />,
  settingspage: () => <SettingsPage />,
  accountpage: () => <AccountPage />,
  loginpage: () => <LoginPage />,
  leaderboardpage: () => <LeaderboardPage />,
  profilepage: () => <ProfilePage />,
  profilesearchpage: () => <ProfileSearchPage />,
  myprofile: () => <MyProfile />,
  modals: () => <Modals />,
  popups: () => <Popups />,
  overlays: () => <Overlays />,
  theme: () => <Theme />,
  header: () => <Header />,
  devtools: () => <DevTools />,
  testpage: () => <TestPage />,
  commandlinehotkey: () => <CommandlineHotkey />,
  friendspage: () => <FriendsPage />,
  notfoundpage: () => <NotFoundPage />,
  accountsettingspage: () => <AccountSettingsPage />,
  bartimerprogress: () => <BarTimerProgress />,
  loadingpage: () => <LoadingPage />,
  monkeypower: () => <MonkeyPower />,
  verticalads: () => (
    <>
      <Advertisement
        id="ad-vertical-left"
        visible={["on", "sellout"]}
        staticVisibility
        vertical
        focus
      />
      <Advertisement
        id="ad-vertical-right"
        visible={["on", "sellout"]}
        staticVisibility
        vertical
        focus
      />
    </>
  ),
  footerad: () => (
    <Advertisement
      id="ad-footer"
      visible="sellout"
      staticVisibility
      focus
      class="col-[full-width]"
      smallClass="col-[content]"
    />
  ),
};

function mountToMountpoint(name: string, component: () => JSXElement): void {
  for (const mountPoint of qsa(name)) {
    render(
      () => (
        <QueryClientProvider client={queryClient}>
          {component()}
        </QueryClientProvider>
      ),
      mountPoint.native,
    );
  }
}

export function mountComponents(): void {
  for (const [query, component] of Object.entries(components)) {
    mountToMountpoint(`mount[data-component=${query}]`, component);
  }
}
