import { expect, it, vi } from "vite-plus/test";

const state = vi.hoisted(() => {
  let finishLocal!: () => void;
  return {
    local: new Promise<void>((resolve) => {
      finishLocal = resolve;
    }),
    finishLocal: () => finishLocal(),
    get: vi.fn(),
    apply: vi.fn(),
    save: vi.fn(),
  };
});
vi.mock("../../src/ts/config/lifecycle", () => ({
  configLoadPromise: state.local,
  applyConfig: state.apply,
}));
vi.mock("../../src/ts/config/persistence", () => ({
  saveFullConfigToLocalStorage: state.save,
}));
vi.mock("../../src/ts/config/store", () => ({ Config: { theme: "local" } }));
vi.mock("../../src/ts/config/utils", () => ({
  migrateConfig: (config: unknown) => config,
}));
vi.mock("../../src/ts/ape", () => ({
  default: { configs: { get: state.get } },
}));

it("fetches server settings immediately and applies them after local settings", async () => {
  const config = { theme: "remote" };
  state.get.mockResolvedValue({ status: 200, body: { data: config } });
  const { updateFromServer } = await import("../../src/ts/config/remote");
  const updating = updateFromServer();
  await Promise.resolve();
  await Promise.resolve();
  expect(state.get).toHaveBeenCalledOnce();
  expect(state.apply).not.toHaveBeenCalled();
  state.finishLocal();
  await updating;
  expect(state.apply).toHaveBeenCalledWith(config);
  expect(state.save).toHaveBeenCalledWith(true);
});
