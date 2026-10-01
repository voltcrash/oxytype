import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, expect, it } from "vite-plus/test";

import { PageHead } from "../../../src/ts/components/core/PageHead";
import {
  setOpenGraphUrl,
  setPageTitle,
} from "../../../src/ts/states/page-head";

afterEach(() => {
  cleanup();
  setOpenGraphUrl(undefined);
  setPageTitle(undefined);
});

it("updates the shell's existing Open Graph tag without duplicating it", () => {
  const meta = document.createElement("meta");
  meta.setAttribute("property", "og:url");
  document.head.appendChild(meta);
  const { unmount } = render(() => <PageHead />);
  setOpenGraphUrl("https://monkeytype.com/settings");
  setPageTitle("Settings | Monkeytype");
  expect(meta.content).toBe("https://monkeytype.com/settings");
  expect(
    document.head.querySelectorAll('meta[property="og:url"]'),
  ).toHaveLength(1);
  expect(document.title).toBe("Settings | Monkeytype");
  unmount();
  expect(meta.isConnected).toBe(true);
  meta.remove();
});

it("cleans up a tag created when the shell has none", () => {
  const { unmount } = render(() => <PageHead />);
  setOpenGraphUrl("https://monkeytype.com/");
  expect(document.head.querySelector('meta[property="og:url"]')).not.toBeNull();
  unmount();
  expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
});
