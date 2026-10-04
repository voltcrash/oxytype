import { typedKeys } from "@oxytype/util/objects";
import { animate } from "animejs";
import { For, JSXElement, onCleanup, Show } from "solid-js";

import { createEffectOn } from "../../hooks/effects";
import { PageName } from "../../pages/page";
import { getPageView } from "../../states/page-transition";
import { cn } from "../../utils/cn";
import { NotFoundPage } from "./404Page";
import { AboutPage } from "./AboutPage";
import { AccountPage } from "./account/AccountPage";
import { FriendsPage } from "./connections/FriendsPage";
import { LeaderboardPage } from "./leaderboard/LeaderboardPage";
import { LoadingPage } from "./LoadingPage";
import { LoginPage } from "./login/LoginPage";
import { ProfilePage } from "./profile/ProfilePage";
import { ProfileSearchPage } from "./profile/ProfileSearchPage";
import { SettingsPage } from "./settings/SettingsPage";
import { TestPage } from "./test/TestPage";

export function AppPages(): JSXElement {
  const refs = new Map<PageName, HTMLElement>();
  const view = (id: PageName) =>
    getPageView().id === id ? getPageView() : undefined;

  const shell = (
    id: PageName,
    children: JSXElement,
    className?: string,
  ): JSXElement => {
    return (
      <div
        ref={(el) => refs.set(id, el)}
        id={`page${id[0]?.toUpperCase()}${id.slice(1)}`}
        class={cn(
          `page page${id[0]?.toUpperCase()}${id.slice(1)}`,
          className,
          view(id)?.phase === "prepared" && "hidden",
          view(id)?.phase === "active" && "active",
        )}
      >
        {children}
      </div>
    );
  };

  // Keep the component owners and cached test refs alive, like the old Skeleton.
  // Show attaches/detaches their nodes; existing Page gates own page content.
  const pages: Record<PageName, JSXElement> = {
    loading: shell(
      "loading",
      <LoadingPage />,
      "grid h-full w-full place-self-center content-center items-center",
    ),
    about: shell("about", <AboutPage />, "full-width"),
    settings: shell("settings", <SettingsPage />),
    account: shell("account", <AccountPage />),
    login: shell("login", <LoginPage />),
    profile: shell("profile", <ProfilePage />),
    profileSearch: shell("profileSearch", <ProfileSearchPage />),
    test: <TestPage ref={(el) => refs.set("test", el)} />,
    "404": shell("404", <NotFoundPage />),
    friends: shell("friends", <FriendsPage />),
    leaderboards: shell("leaderboards", <LeaderboardPage />),
  };

  createEffectOn(getPageView, (state) => {
    const request = state.animation;
    if (state.id === null || request === undefined) return;
    const element = refs.get(state.id);
    if (element === undefined) throw new Error(`Missing page ref: ${state.id}`);
    const entering = state.phase === "in";
    const animation = animate(element, {
      opacity: entering ? [0, 1] : [1, 0],
      duration: request.duration,
      onComplete: request.complete,
    });
    onCleanup(() => {
      animation.cancel();
      request.complete();
    });
  });

  return (
    <For each={typedKeys(pages)}>
      {(id) => <Show when={getPageView().id === id}>{pages[id]}</Show>}
    </For>
  );
}
