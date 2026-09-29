import { vi } from "vite-plus/test";
vi.mock("../../src/ts/firebase", () => ({
  app: undefined,
  Auth: undefined,
}));
