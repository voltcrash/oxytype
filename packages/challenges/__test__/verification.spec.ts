import { describe, expect, it } from "vite-plus/test";
import type { Config } from "@oxytype/schemas/configs";
import {
  challengeSetup,
  getChallenges,
  verifyChallenge,
  type Challenge,
  type ChallengeResult,
} from "../src/index";

describe("shared challenge rules", () => {
  const config = { language: "english", difficulty: "normal" } as Config;
  const result: ChallengeResult = {
    wpm: 100,
    rawWpm: 110,
    acc: 100,
    consistency: 100,
    afkDuration: 0,
    testDuration: 60,
    funbox: [],
  };
  const challenge: Challenge = {
    name: "englishMaster",
    display: "test",
    description: "test",
    category: "accuracy",
    settings: {
      type: "customTime",
      parameters: { time: 60 },
      requirements: {
        wpm: { min: 100 },
        acc: { exact: 100 },
        config: { language: "english" },
        funbox: { exact: [] },
      },
    },
  };
  it("checks thresholds, config and extra funboxes", () => {
    expect(verifyChallenge(result, config, challenge)).toEqual([]);
    expect(
      verifyChallenge(
        { ...result, wpm: 99, acc: 99, funbox: ["binary"] },
        { ...config, language: "french" },
        challenge,
      ),
    ).toEqual([
      "WPM below 100",
      "Accuracy not 100",
      "language not set to english",
      "binary funbox active",
    ]);
    expect(
      verifyChallenge({ ...result, afkDuration: 7 }, config, challenge),
    ).toEqual(["AFK time is greater than 10%"]);
  });
  it("produces a setup for every catalog item without mutating it", () => {
    for (const entry of getChallenges()) {
      const before = structuredClone(entry);
      const setup = challengeSetup(entry);
      if (entry.settings.type !== "other") {
        expect(setup.config.mode).toBeDefined();
      }
      if (entry.settings.type === "customText") {
        expect(setup.customText?.limit.value).toBe(
          entry.settings.parameters.limit,
        );
      }
      if (entry.settings.type === "script") {
        expect(setup.script).toBe(entry.settings.parameters.script);
      }
      expect(entry).toEqual(before);
    }
  });
});
