import { afterAll, afterEach, vi } from "vite-plus/test";
import { BASE_CONFIGURATION } from "../src/constants/base-configuration";
import "./setup-common-mocks";
import { __testing } from "../src/init/configuration";

process.env["MODE"] = "dev";
process.env["TZ"] = "UTC";
vi.mock("../src/init/configuration", async (importOriginal) => {
  const orig = (await importOriginal()) as any;

  return {
    __testing: orig.__testing,
    getLiveConfiguration: () => BASE_CONFIGURATION,
    getCachedConfiguration: () => BASE_CONFIGURATION,
    patchConfiguration: vi.fn(),
  };
});

vi.mock("../src/init/db", () => ({
  __esModule: true,
  getDb: () => undefined,
  collection: () => undefined,
  close: () => {
    //
  },
}));

afterEach(async () => {
  //nothing
});

afterAll(async () => {
  vi.resetAllMocks();
});
