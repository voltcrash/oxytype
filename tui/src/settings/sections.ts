import type { Config } from "@oxytype/schemas/configs";

import { LanguageSchema } from "@oxytype/schemas/languages";
import { get as getTypingSpeedUnit } from "@oxytype/typing-core/typing-speed-units";

import type { Account } from "../account";
import type { SettingRow, SettingSection, RowContext } from "./rows";

import { configRow, settingTitle } from "./rows";

export type SectionContext = RowContext & {
  loggedIn: () => boolean;
  account?: Account;
};

function speed(context: RowContext, key: keyof Config): () => string {
  return () => {
    const unit = context.store.config.typingSpeedUnit;
    const value = getTypingSpeedUnit(unit).fromWpm(
      Number(context.store.config[key]),
    );
    return `${Math.round(value * 100) / 100} ${unit}`;
  };
}

function toWpm(context: RowContext): (input: string) => number {
  return (input) =>
    getTypingSpeedUnit(context.store.config.typingSpeedUnit).toWpm(
      Number(input),
    );
}

function replaceUnderscores(value: unknown): string {
  return String(value).replace(/_/g, " ");
}

function behavior(context: SectionContext): SettingSection {
  const { store } = context;
  return {
    id: "behavior",
    title: "behavior",
    groups: [
      {
        title: "saved tests",
        available: context.loggedIn,
        rows: [configRow(context, "resultSaving")],
      },
      {
        title: "test behavior",
        rows: [
          configRow(context, "difficulty"),
          configRow(context, "quickRestart"),
          configRow(context, "repeatQuotes"),
          configRow(context, "blindMode"),
          configRow(context, "alwaysShowWordsHistory"),
          configRow(context, "singleListCommandLine"),
          {
            ...configRow(context, "commandPaletteHotkey"),
            value: () => `${store.config.commandPaletteHotkey} · terminal ^p`,
            activate: undefined,
            note: "web only",
          },
        ],
      },
      {
        title: "speed & accuracy",
        rows: [
          configRow(context, "minWpm", {
            options: ["off", "custom"],
            detail: speed(context, "minWpmCustomSpeed"),
            resetKeys: ["minWpmCustomSpeed", "minWpm"],
            input: {
              value: "custom",
              secondKey: "minWpmCustomSpeed",
              convert: toWpm(context),
              defaultValue: () =>
                speed(context, "minWpmCustomSpeed")().split(" ")[0] ?? "",
            },
          }),
          configRow(context, "minAcc", {
            options: ["off", "custom"],
            detail: () => `${store.config.minAccCustom}%`,
            resetKeys: ["minAccCustom", "minAcc"],
            input: {
              value: "custom",
              secondKey: "minAccCustom",
              convert: Number,
            },
          }),
          configRow(context, "minBurst", {
            detail: speed(context, "minBurstCustomSpeed"),
            resetKeys: ["minBurstCustomSpeed", "minBurst"],
            input: {
              display: "min word burst speed",
              secondKey: "minBurstCustomSpeed",
              convert: toWpm(context),
              defaultValue: () =>
                speed(context, "minBurstCustomSpeed")().split(" ")[0] ?? "",
            },
          }),
        ],
      },
      {
        title: "language",
        rows: [
          configRow(context, "language", {
            options: LanguageSchema.options,
            optionDisplay: replaceUnderscores,
          }),
          configRow(context, "britishEnglish"),
        ],
      },
      {
        title: "funbox",
        rows: [
          configRow(context, "customLayoutfluid", {
            input: {
              defaultValue: () => store.config.customLayoutfluid.join(" "),
              convert: (value) => value.split(/\s+/).filter(Boolean),
            },
          }),
          configRow(context, "customPolyglot", {
            input: {
              defaultValue: () => store.config.customPolyglot.join(" "),
              convert: (value) => value.split(/\s+/).filter(Boolean),
            },
          }),
        ],
      },
    ],
  };
}

/** Settings sections in the web's order. */
export function settingSections(context: SectionContext): SettingSection[] {
  return [behavior(context)];
}

/** Rows in display order, for search across every section. */
export function allRows(sections: SettingSection[]): SettingRow[] {
  return sections.flatMap((section) =>
    section.groups.flatMap((group) => group.rows),
  );
}

export { settingTitle };
