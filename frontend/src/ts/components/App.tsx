import { QueryClientProvider } from "@tanstack/solid-query";
import { JSXElement } from "solid-js";
import { Portal } from "solid-js/web";

import { queryClient } from "../queries";
import { Advertisement } from "./common/Advertisement";
import { Theme } from "./core/Theme";
import { DevTools } from "./dev/DevTools";
import { Footer } from "./layout/footer/Footer";
import { Header } from "./layout/header/Header";
import { Overlays } from "./layout/overlays/Overlays";
import { Modals } from "./modals/Modals";
import { NotFoundPage } from "./pages/404Page";
import { AboutPage } from "./pages/AboutPage";
import { AccountSettingsPage } from "./pages/account-settings/AccountSettingsPage";
import { AccountPage } from "./pages/account/AccountPage";
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

export function App(): JSXElement {
  return (
    <QueryClientProvider client={queryClient}>
      <Portal mount={document.body}>
        <Overlays />
        <Theme />
        <BarTimerProgress />
        <div id="solidmodals">
          <Modals />
        </div>
        <div id="solidpopups">
          <Popups />
        </div>
        <DevTools />
        <MonkeyPower />
      </Portal>
      <Header />
      <main class="full-width content-grid h-full">
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
        <div
          class="page pageLoading grid h-full w-full content-center items-center place-self-center"
          id="pageLoading"
        >
          <LoadingPage />
        </div>
        <div class="page pageAbout full-width hidden" id="pageAbout">
          <AboutPage />
        </div>
        <div class="page pageSettings hidden" id="pageSettings">
          <SettingsPage />
        </div>
        <div class="page pageAccount hidden" id="pageAccount">
          <AccountPage />
        </div>
        <div class="page pageLogin hidden" id="pageLogin">
          <LoginPage />
        </div>
        <div class="page pageProfile hidden" id="pageProfile">
          <ProfilePage />
        </div>
        <div class="page pageProfileSearch hidden" id="pageProfileSearch">
          <ProfileSearchPage />
        </div>
        <TestPage />
        <div class="page page404 hidden" id="page404">
          <NotFoundPage />
        </div>
        <div class="page pageAccountSettings hidden" id="pageAccountSettings">
          <AccountSettingsPage />
        </div>
        <div class="page pageFriends hidden" id="pageFriends">
          <FriendsPage />
        </div>
        <div class="page pageLeaderboards hidden" id="pageLeaderboards">
          <LeaderboardPage />
        </div>
      </main>
      <Footer />
      <Advertisement
        id="ad-footer"
        visible="sellout"
        staticVisibility
        focus
        class="col-[full-width]"
        smallClass="col-[content]"
      />
    </QueryClientProvider>
  );
}
