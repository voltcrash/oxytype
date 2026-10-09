import { createStore } from "solid-js/store";
import { beforeEach, expect, it, vi } from "vite-plus/test";

const { replaceUrl } = vi.hoisted(() => ({ replaceUrl: vi.fn() }));
const [location, setLocation] = createStore({
  pathname: "/profile/Tester",
  search: "",
  hash: "#stats",
});
vi.mock("@solidjs/router", () => ({ useLocation: () => location }));
vi.mock("../../src/ts/navigation/navigation", () => ({ replaceUrl }));

import { useClientSelection } from "../../src/ts/hooks/useClientSelection";

beforeEach(() => {
  setLocation("search", "");
  replaceUrl.mockClear();
});
it("defaults omitted or invalid clients to web and follows navigation", () => {
  const [client] = useClientSelection();
  expect(client()).toBe("web");
  setLocation("search", "?client=tui");
  expect(client()).toBe("tui");
  setLocation("search", "?client=invalid");
  expect(client()).toBe("web");
  setLocation("search", "");
  expect(client()).toBe("web");
});
it("writes a client link while preserving unrelated parameters and hash", () => {
  setLocation("search", "?client=web&filter=recent");
  const [, select] = useClientSelection();
  select("tui");
  expect(replaceUrl).toHaveBeenCalledWith(
    "/profile/Tester?client=tui&filter=recent#stats",
  );
});
