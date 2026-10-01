import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vitest";

import {
  FilePicker,
  openFilePicker,
} from "../../../src/ts/components/common/FilePicker";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("opens a connected file input and retains it until the consumer finishes reading", async () => {
  const click = vi
    .spyOn(HTMLInputElement.prototype, "click")
    .mockImplementation(function (this: HTMLInputElement) {
      expect(this.isConnected).toBe(true);
    });
  let finish: (() => void) | undefined;
  const selected = vi.fn(
    async (_file: File | undefined, cleanup: () => void) => {
      finish = cleanup;
    },
  );
  const { container, unmount } = render(() => <FilePicker />);
  openFilePicker({ accept: "image/*", onFile: selected });
  const input = container.querySelector("input") as HTMLInputElement;
  expect(click).toHaveBeenCalledOnce();
  expect(input.accept).toBe("image/*");
  const file = new File(["image"], "image.png", { type: "image/png" });
  fireEvent.change(input, { target: { files: [file] } });
  expect(selected).toHaveBeenCalledWith(file, expect.any(Function));
  expect(input.isConnected).toBe(true);
  finish?.();
  expect(input.isConnected).toBe(false);
  unmount();
  expect(() => openFilePicker({ accept: "image/*", onFile: selected })).toThrow(
    "File picker is not mounted",
  );
});
