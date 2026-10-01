import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { onMount } from "solid-js";
import { afterEach, expect, it, vi } from "vite-plus/test";

import { useInputListener } from "../../src/ts/hooks/useInputListener";
import { useRef } from "../../src/ts/hooks/useRef";
afterEach(cleanup);
it("unbinds input listeners when the test component is disposed", () => {
  const handler = vi.fn();
  let input: HTMLTextAreaElement | undefined;
  const { unmount } = render(() => {
    const [ref, element] = useRef<HTMLTextAreaElement>();
    onMount(() => {
      input = element();
      if (input) useInputListener(input, "keydown", handler);
    });
    return <textarea ref={ref}></textarea>;
  });
  fireEvent.keyDown(input as HTMLTextAreaElement, { key: "a" });
  expect(handler).toHaveBeenCalledOnce();
  unmount();
  fireEvent.keyDown(input as HTMLTextAreaElement, { key: "b" });
  expect(handler).toHaveBeenCalledOnce();
});
