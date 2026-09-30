import { QueryClientProvider } from "@tanstack/solid-query";
import { JSXElement } from "solid-js";
import { render } from "solid-js/web";

import { queryClient } from "../queries";
import { resultWordHighlightEvent } from "../states/result";
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
import { CapsWarning } from "./pages/test/CapsWarning";
import { CompositionDisplay } from "./pages/test/CompositionDisplay";
import { FunboxTimers } from "./pages/test/FunboxTimer";
import { Keymap } from "./pages/test/Keymap";
import { BarTimerProgress } from "./pages/test/live-stats/BarTimerProgress";
import { LiveStatsMini } from "./pages/test/live-stats/LiveStatsMini";
import { LiveStatsTextBottom } from "./pages/test/live-stats/LiveStatsTextBottom";
import { LiveStatsTextTop } from "./pages/test/live-stats/LiveStatsTextTop";
import { TestModesNotice } from "./pages/test/modes-notice/TestModesNotice";
import { Monkey } from "./pages/test/Monkey";
import { MonkeyPower } from "./pages/test/MonkeyPower";
import { OutOfFocusWarning } from "./pages/test/OutOfFocusWarning";
import { Premid } from "./pages/test/Premid";
import { RestartTestButton } from "./pages/test/RestartTestButton";
import { ResultButtons } from "./pages/test/result/ResultButtons";
import { ResultChart } from "./pages/test/result/ResultChart";
import { ResultLoginTip } from "./pages/test/result/ResultLoginTip";
import { ResultReplay } from "./pages/test/result/ResultReplay";
import { ResultStats } from "./pages/test/result/ResultStats";
import { ResultWatermark } from "./pages/test/result/ResultWatermark";
import { ResultWordsHistory } from "./pages/test/result/ResultWordsHistory";
import { TestConfig } from "./pages/test/TestConfig";
import { TestInitFailed } from "./pages/test/TestInitFailed";
import { TestLoading } from "./pages/test/TestLoading";
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
  testconfig: () => <TestConfig />,
  commandlinehotkey: () => <CommandlineHotkey />,
  testmodesnotice: () => <TestModesNotice />,
  capswarning: () => <CapsWarning />,
  compositiondisplay: () => <CompositionDisplay />,
  friendspage: () => <FriendsPage />,
  notfoundpage: () => <NotFoundPage />,
  accountsettingspage: () => <AccountSettingsPage />,
  keymap: () => <Keymap />,
  monkey: () => <Monkey />,
  outoffocuswarning: () => <OutOfFocusWarning />,
  livestatsmini: () => <LiveStatsMini />,
  livestatstexttop: () => <LiveStatsTextTop />,
  livestatstextbottom: () => <LiveStatsTextBottom />,
  bartimerprogress: () => <BarTimerProgress />,
  premid: () => <Premid />,
  loadingpage: () => <LoadingPage />,
  testinitfailed: () => <TestInitFailed />,
  funboxtimers: () => <FunboxTimers />,
  restarttestbutton: () => <RestartTestButton />,
  testloading: () => <TestLoading />,
  monkeypower: () => <MonkeyPower />,
  resultstats: () => <ResultStats />,
  resultwordshistory: () => <ResultWordsHistory />,
  resultreplay: () => <ResultReplay />,
  resultbuttons: () => <ResultButtons />,
  resultfooter: () => (
    <>
      <ResultLoginTip />
      <ResultWatermark />
    </>
  ),
  resultchart: () => (
    <ResultChart
      onHighlightWords={(firstWordIndex, lastWordIndex) =>
        resultWordHighlightEvent.dispatch({
          type: "highlight",
          firstWordIndex,
          lastWordIndex,
        })
      }
      onHoverChange={(hovering) =>
        resultWordHighlightEvent.dispatch({ type: "hoverChart", hovering })
      }
    />
  ),
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
  resultad: () => (
    <Advertisement
      id="ad-result"
      visible={["result", "on", "sellout"]}
      staticVisibility
      withText
      hideWhileScreenshotting
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
