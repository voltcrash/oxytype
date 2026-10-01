import { cleanup, render } from "@solidjs/testing-library";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

import { useWordsInputScroll } from "../../src/ts/hooks/useWordsInputScroll";
import { centerWordsInputEvent } from "../../src/ts/states/words-layout";

let wrapper: HTMLDivElement;
let input: HTMLTextAreaElement;
let height: number;
let top: number;
const scroll = vi.fn();

beforeEach(() => {
  height = 900;
  top = 600;
  wrapper = document.createElement("div");
  input = document.createElement("textarea");
  Object.defineProperty(wrapper, "offsetHeight", { get: () => height });
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
  vi.spyOn(input, "getBoundingClientRect").mockImplementation(
    () => ({ top }) as DOMRect,
  );
  input.scrollIntoView = scroll;
  scroll.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function mount(): ReturnType<typeof render> {
  return render(() => {
    useWordsInputScroll(wrapper, input);
    return null;
  });
}

describe("words input centering", () => {
  it("centers input only when an oversized wrapper puts it below center", () => {
    mount();
    centerWordsInputEvent.dispatch(false);
    expect(scroll).toHaveBeenCalledWith({ block: "center" });
    top = 400;
    centerWordsInputEvent.dispatch(false);
    top = 0;
    centerWordsInputEvent.dispatch(false);
    expect(scroll).toHaveBeenCalledOnce();
  });
  it("forces centering but never scrolls a wrapper that fits the viewport", () => {
    mount();
    top = 0;
    centerWordsInputEvent.dispatch(true);
    expect(scroll).toHaveBeenCalledOnce();
    height = 799;
    centerWordsInputEvent.dispatch(true);
    expect(scroll).toHaveBeenCalledOnce();
    height = 800;
    centerWordsInputEvent.dispatch(true);
    expect(scroll).toHaveBeenCalledTimes(2);
  });
  it("removes the scrolling listener when its component disposes", () => {
    const { unmount } = mount();
    unmount();
    centerWordsInputEvent.dispatch(true);
    expect(scroll).not.toHaveBeenCalled();
  });
});
