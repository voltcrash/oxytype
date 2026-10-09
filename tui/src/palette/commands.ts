import type { Config } from "@oxytype/schemas/configs";

import { LanguageSchema } from "@oxytype/schemas/languages";
import { get as getTypingSpeedUnit } from "@oxytype/typing-core/typing-speed-units";
import { ThemesList } from "@oxytype/typing-core/themes";
import { canQuickRestart } from "@oxytype/typing-core/quick-restart";

import type { Account } from "../account";
import type { ConfigStore } from "../config/store";
import type { Notifications } from "../notifications";
import type { Router } from "../router/router";
import type { TypingTest } from "../test/typing-test";
import type { Command, CommandGroup } from "./types";

import { isWebOnly } from "../config/support";
import { configTools } from "../config/tools";
import { configCommand, type ConfigCommandSpec } from "./config-commands";

export type CommandContext = {
  store: ConfigStore;
  router: Router;
  test: TypingTest;
  notifications: Notifications;
  account?: Account;
  /** OSC 52; false when the terminal cannot copy. */
  copy: (text: string) => boolean;
  openUrl: (url: string) => Promise<void>;
};

const quoteLengthNames: Record<number, string> = {
  0: "short",
  1: "medium",
  2: "long",
  3: "thicc",
  [-3]: "favorite",
};

const discussionsUrl = "https://github.com/voltcrash/oxytype/discussions";

function toWpm(store: ConfigStore): (input: string) => number {
  return (input) =>
    getTypingSpeedUnit(store.config.typingSpeedUnit).toWpm(Number(input));
}

function fromWpm(store: ConfigStore, key: keyof Config): () => string {
  return () =>
    String(
      getTypingSpeedUnit(store.config.typingSpeedUnit).fromWpm(
        Number(store.config[key]),
      ),
    );
}

function replaceUnderscores(value: unknown): string {
  return String(value).replace(/_/g, " ");
}

/** Configured commands for every setting the web palette offers. */
function settingCommands(context: CommandContext): Command[] {
  const { store } = context;
  const setting = <K extends keyof Config>(
    key: K,
    spec: ConfigCommandSpec<K> = {},
  ): Command =>
    configCommand(store, key, {
      ...spec,
      note: spec.note ?? (isWebOnly(key) ? "web only" : undefined),
    });
  return [
    // test
    setting("punctuation"),
    setting("numbers"),
    setting("mode"),
    setting("time", {
      options: [15, 30, 60, 120],
      input: { convert: Number },
    }),
    setting("words", {
      alias: "words",
      options: [10, 25, 50, 100],
      input: { convert: Number },
    }),
    setting("quoteLength", {
      alias: "quotes",
      options: [[0, 1, 2, 3], [0], [1], [2], [3], [-3]],
      includes: true,
      optionDisplay: (value) =>
        value.length === 4 ? "all" : (quoteLengthNames[value[0] ?? 0] ?? "all"),
      optionAvailable: (value) =>
        value[0] !== -3 || context.account?.auth.user() !== undefined,
    }),
    setting("language", {
      options: LanguageSchema.options,
      optionDisplay: replaceUnderscores,
    }),
    // behavior
    setting("resultSaving", { alias: "results practice incognito" }),
    setting("difficulty"),
    setting("quickRestart"),
    setting("repeatQuotes"),
    setting("blindMode"),
    setting("alwaysShowWordsHistory"),
    setting("singleListCommandLine"),
    setting("minWpm", {
      display: "Minimum speed...",
      alias: "wpm",
      options: ["off"],
      input: {
        value: "custom",
        secondKey: "minWpmCustomSpeed",
        convert: toWpm(store),
        defaultValue: fromWpm(store, "minWpmCustomSpeed"),
      },
    }),
    setting("minAcc", {
      display: "Minimum accuracy...",
      options: ["off"],
      input: { value: "custom", secondKey: "minAccCustom", convert: Number },
    }),
    {
      id: "changeMinBurst",
      display: "Minimum word burst...",
      alias: "minimum",
      subgroup: () => ({
        title: "Minimum word burst...",
        list: [
          {
            id: "setMinBurstOff",
            display: "off",
            active: () => store.config.minBurst === "off",
            exec: () => {
              store.set("minBurst", "off");
            },
          },
          ...(["fixed", "flex"] as const).map((mode): Command => ({
            id: `setMinBurst${mode}`,
            display: `${mode}...`,
            active: () => store.config.minBurst === mode,
            input: {
              placeholder: `Minimum word burst (${mode})`,
              defaultValue: fromWpm(store, "minBurstCustomSpeed"),
              submit: (value) => {
                if (value.trim() === "") return "Enter a number";
                const speed = toWpm(store)(String(Number.parseInt(value)));
                if (Number.isNaN(speed)) return "Enter a number";
                if (!store.set("minBurst", mode)) return "Setting rejected";
                return store.set("minBurstCustomSpeed", speed)
                  ? undefined
                  : "Invalid value";
              },
            },
          })),
        ],
      }),
    },
    setting("britishEnglish"),
    setting("customLayoutfluid", {
      input: {
        defaultValue: () => store.config.customLayoutfluid.join(" "),
        convert: (value) => value.split(/\s+/).filter(Boolean),
      },
    }),
    setting("customPolyglot", {
      input: {
        defaultValue: () => store.config.customPolyglot.join(" "),
        convert: (value) => value.split(/\s+/).filter(Boolean),
      },
    }),
    // input
    setting("freedomMode"),
    setting("strictSpace"),
    setting("oppositeShiftMode"),
    setting("stopOnError"),
    setting("deleteOnError", { optionDisplay: replaceUnderscores }),
    setting("confidenceMode"),
    setting("quickEnd"),
    setting("indicateTypos"),
    setting("compositionDisplay"),
    setting("hideExtraLetters"),
    setting("lazyMode"),
    setting("layout", {
      optionDisplay: (layout) =>
        layout === "default" ? "off" : replaceUnderscores(layout),
    }),
    setting("codeUnindentOnBackspace"),
    // sound
    setting("soundVolume", {
      options: [0.1, 0.5, 1],
      optionDisplay: (value) =>
        ({ 0.1: "quiet", 0.5: "medium", 1: "loud" })[value] ?? String(value),
      input: { convert: Number },
    }),
    setting("playSoundOnClick", {
      alias: "play",
      display: "Sound on click...",
    }),
    setting("playSoundOnError", {
      alias: "play",
      display: "Sound on error...",
    }),
    setting("playTimeWarning", { alias: "sound" }),
    // caret
    setting("smoothCaret"),
    setting("caretStyle"),
    setting("paceCaret", {
      display: "Pace caret mode...",
      options: ["off", "pb", "tagPb", "last", "average", "daily"],
      input: {
        value: "custom",
        secondKey: "paceCaretCustomSpeed",
        convert: toWpm(store),
        defaultValue: fromWpm(store, "paceCaretCustomSpeed"),
      },
    }),
    setting("repeatedPace"),
    setting("paceCaretStyle"),
    // appearance
    setting("liveSpeedStyle", { alias: "wpm" }),
    setting("liveAccStyle", { alias: "wpm" }),
    setting("liveBurstStyle", { alias: "wpm" }),
    setting("timerStyle", {
      alias: "timer",
      optionDisplay: replaceUnderscores,
    }),
    setting("timerColor", {
      display: "Live progress color...",
      alias: "timer speed wpm burst acc",
    }),
    setting("timerOpacity", {
      display: "Live progress opacity...",
      alias: "timer speed wpm burst acc",
    }),
    setting("highlightMode", { optionDisplay: replaceUnderscores }),
    setting("typedEffect"),
    setting("tapeMode"),
    setting("tapeMargin", { input: { convert: Number } }),
    setting("smoothLineScroll"),
    setting("showAllLines"),
    setting("typingSpeedUnit", {
      options: ["wpm", "cpm", "wps", "cps"],
    }),
    setting("alwaysShowDecimalPlaces"),
    setting("startGraphsAtZero"),
    setting("maxLineWidth", { alias: "page", input: { convert: Number } }),
    setting("fontSize", { input: { convert: Number } }),
    setting("fontFamily"),
    setting("keymapMode", { alias: "keyboard" }),
    setting("keymapStyle", {
      alias: "keyboard",
      optionDisplay: replaceUnderscores,
    }),
    setting("keymapLegendStyle", { alias: "keyboard" }),
    setting("keymapSize", { alias: "keyboard", input: { convert: Number } }),
    setting("keymapLayout", {
      alias: "keyboard",
      optionDisplay: (layout) =>
        layout === "overrideSync"
          ? "emulator sync"
          : replaceUnderscores(layout),
    }),
    setting("keymapKeys", {
      alias: "keyboard",
      optionDisplay: replaceUnderscores,
    }),
    // theme
    {
      id: "changeTheme",
      display: "Theme...",
      subgroup: () => ({
        title: "Theme...",
        list: [
          ...ThemesList.filter((theme) =>
            store.config.favThemes.includes(theme.name),
          ),
          ...ThemesList.filter(
            (theme) => !store.config.favThemes.includes(theme.name),
          ),
        ].map((theme) => ({
          id: `changeTheme${theme.name}`,
          display: replaceUnderscores(theme.name),
          active: () =>
            !store.config.customTheme && store.config.theme === theme.name,
          exec: () => {
            store.set("theme", theme.name);
          },
        })),
      }),
    },
    setting("customTheme"),
    setting("flipTestColors"),
    setting("colorfulMode"),
    {
      id: "addThemeToFavorite",
      display: "Add current theme to favorite",
      available: () =>
        !store.config.customTheme &&
        !store.config.favThemes.includes(store.config.theme),
      exec: () => {
        store.set("favThemes", [...store.config.favThemes, store.config.theme]);
      },
    },
    {
      id: "removeThemeFromFavorite",
      display: "Remove current theme from favorite",
      available: () =>
        !store.config.customTheme &&
        store.config.favThemes.includes(store.config.theme),
      exec: () => {
        store.set(
          "favThemes",
          store.config.favThemes.filter((it) => it !== store.config.theme),
        );
      },
    },
    setting("customBackground", { input: { convert: (value) => value } }),
    setting("customBackgroundSize"),
    setting("randomTheme"),
    // hide elements
    setting("showKeyTips"),
    setting("showOutOfFocusWarning"),
    setting("showTestModesNotice"),
    setting("capsLockWarning"),
    setting("showAverage"),
    setting("showPb"),
    setting("monkeyPowerLevel"),
  ];
}

function canBailOut(context: CommandContext): boolean {
  const config = context.store.config;
  return (
    context.test.status() === "running" &&
    (config.mode === "zen" ||
      !canQuickRestart(
        config.mode,
        config.words,
        config.time,
        context.test.customText,
        context.test.customText.text.join(" ").length >= 10000,
      ) ||
      (config.mode === "time" && config.time === 0) ||
      (config.mode === "words" && config.words === 0))
  );
}

/** The terminal's command list, following the web palette's order. */
export function rootCommands(context: CommandContext): CommandGroup {
  const { router, test, notifications } = context;
  const resultVisible = (): boolean =>
    router.current() === "result" && test.result() !== undefined;
  const copy = (text: string, success: string): void => {
    const copied = context.copy(text);
    notifications.notify(
      copied ? success : "This terminal cannot copy to the clipboard",
      copied ? "success" : "error",
    );
  };
  const settings = settingCommands(context);
  const navigate = (screen: Parameters<Router["push"]>[0]) => () => {
    if (screen === "test" && test.status() === "finished") void test.restart();
    router.push(screen);
  };
  const list: Command[] = [
    // result
    {
      id: "nextTest",
      display: "Next test",
      alias: "restart start begin type test typing",
      available: resultVisible,
      exec: () => {
        void test.restart();
        router.replace("test");
      },
    },
    {
      id: "repeatTest",
      display: "Repeat test",
      available: resultVisible,
      exec: () => {
        void test.restart(true);
        router.replace("test");
      },
    },
    {
      id: "copyWordsToClipboard",
      display: "Copy words to clipboard",
      available: resultVisible,
      exec: () => copy(test.words().join(""), "Copied to clipboard"),
    },
    ...settings.slice(0, 7),
    {
      id: "bailOut",
      display: "Bail out...",
      available: () => canBailOut(context),
      subgroup: () => ({
        title: "Are you sure...",
        list: [
          { id: "bailOutNo", display: "Nevermind" },
          {
            id: "bailOutForSure",
            display: "Yes, I am sure",
            exec: () => test.finish(),
          },
        ],
      }),
    },
    ...settings.slice(7),
    // other
    {
      id: "viewTypingPage",
      display: "View Typing Page",
      alias: "navigate go to start begin type test",
      exec: navigate("test"),
    },
    {
      id: "viewLeaderboards",
      display: "View Leaderboards",
      alias: "navigate go to",
      exec: navigate("leaderboards"),
    },
    {
      id: "viewSettings",
      display: "View Settings Page",
      alias: "navigate go to",
      exec: navigate("settings"),
    },
    {
      id: "viewAccount",
      display: "View Account Page",
      alias: "navigate go to stats",
      exec: navigate("account"),
    },
    {
      id: "viewHistory",
      display: "View Local History",
      alias: "navigate go to results",
      exec: navigate("history"),
    },
    ...configTools(context),
    {
      id: "clearNotifications",
      display: "Clear all notifications",
      alias: "dismiss",
      exec: () => notifications.clear(),
    },
    {
      id: "copyResultStats",
      display: "Copy last event log (result data)",
      alias: "stats events",
      available: () => test.result() !== undefined,
      exec: () =>
        copy(JSON.stringify(test.result()?.eventLog), "Copied to clipboard"),
    },
    {
      id: "openDiscussions",
      display: "Open project discussions",
      exec: async () => {
        try {
          await context.openUrl(discussionsUrl);
        } catch {
          notifications.notify(`Open ${discussionsUrl} in your browser`);
        }
      },
    },
    {
      id: "logIn",
      display: "Log in",
      alias: "sign in account device",
      available: () =>
        context.account !== undefined &&
        context.account.auth.user() === undefined,
      exec: () => {
        router.push("account");
        void context.account?.auth.login();
      },
    },
    {
      id: "signOut",
      display: "Sign out",
      alias: "log out logout",
      available: () => context.account?.auth.user() !== undefined,
      exec: () => {
        void context.account?.auth.logout();
      },
    },
  ];
  return { title: "", list };
}
