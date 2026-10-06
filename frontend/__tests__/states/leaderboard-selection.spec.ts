import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const { replaceUrl } = vi.hoisted(() => ({
  replaceUrl: vi.fn(async (_url: string) => undefined),
}));
vi.mock("../../src/ts/navigation/navigation", () => ({ replaceUrl }));

afterEach(() => {
  localStorage.removeItem("leaderboardSelector");
  vi.resetModules();
  replaceUrl.mockClear();
});

describe("global leaderboard selection", () => {
  it.each([
    {
      type: "allTime",
      mode: "time",
      mode2: "60",
      language: "english",
      previous: false,
    },
    {
      type: "daily",
      mode: "time",
      mode2: "15",
      language: "english",
      previous: true,
    },
    { type: "weekly", previous: true },
  ])(
    "drops a persisted friend filter for $type and preserves the selection",
    async (selection) => {
      localStorage.setItem(
        "leaderboardSelector",
        JSON.stringify({ ...selection, friendsOnly: true }),
      );
      const state = await import("../../src/ts/states/leaderboard-selection");
      expect(state.getSelection()).toEqual(selection);
      state.updateGetParameters(state.getSelection(), 1);
      const url = new URL(
        replaceUrl.mock.calls[0]?.[0] ?? "",
        "https://oxytype.test",
      );
      expect(url.searchParams.has("friendsOnly")).toBe(false);
    },
  );

  it("ignores a legacy friend filter in a leaderboard link", async () => {
    const state = await import("../../src/ts/states/leaderboard-selection");
    const params = state.LeaderboardUrlParamsSchema.parse({
      type: "allTime",
      friendsOnly: true,
      mode2: "60",
    });
    state.readLeaderboardGetParameters(params);
    expect(state.getSelection()).toEqual({
      type: "allTime",
      mode: "time",
      mode2: "60",
      language: "english",
      previous: false,
    });
    state.updateGetParameters(state.getSelection(), 0);
    expect(replaceUrl).toHaveBeenCalledWith(
      expect.not.stringContaining("friendsOnly"),
    );
  });
});
