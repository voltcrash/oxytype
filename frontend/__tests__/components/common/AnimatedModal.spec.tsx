import { cleanup, render, waitFor } from "@solidjs/testing-library";
import { AnimationParams } from "animejs";
import { createSignal } from "solid-js";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vite-plus/test";

const { animations } = vi.hoisted(() => ({
  animations: [] as { element: HTMLElement; params: AnimationParams }[],
}));

vi.mock("animejs", () => ({
  animate: (element: HTMLElement, params: AnimationParams) => {
    animations.push({ element, params });
    return { cancel: vi.fn() };
  },
}));

vi.mock("../../../src/ts/utils/misc", () => ({
  applyReducedMotion: (duration: number) => duration,
}));

import { AnimatedModal } from "../../../src/ts/components/common/AnimatedModal";
import {
  hideModal,
  hideModalAndClearChain,
  showModal,
} from "../../../src/ts/states/modals";
import { isAnyPopupVisible } from "../../../src/ts/states/overlay-visibility";

async function completeAnimation(): Promise<void> {
  // @ts-expect-error callback arguments unused by modal lifecycle
  await animations.at(-1)?.params.onComplete?.();
}

describe("AnimatedModal", () => {
  let displayStyles: HTMLStyleElement;

  beforeEach(() => {
    hideModalAndClearChain("Support");
    showModal("Support");
    vi.clearAllMocks();
    animations.length = 0;
    // jsdom has no Tailwind stylesheet or layout. Model its display utilities
    // so overlay checks observe the same native open/closed state as browsers.
    displayStyles = document.createElement("style");
    displayStyles.textContent = `
      dialog { display: none; }
      dialog.flex { display: flex; }
      dialog.hidden { display: none; }
      dialog.open\\:flex[open] { display: flex; }
    `;
    document.head.append(displayStyles);

    // Mock dialog methods that don't exist in jsdom
    HTMLDialogElement.prototype.showModal = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.open = true;
    });
    HTMLDialogElement.prototype.show = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.open = false;
    });
  });

  afterEach(() => {
    cleanup();
    hideModalAndClearChain("Support");
    displayStyles.remove();
  });

  function renderModal(props: {
    onEscape?: (e: KeyboardEvent) => void;
    onBackdropClick?: (e: MouseEvent) => void;
    wrapperClass?: string;
    beforeShow?: () => void | Promise<void>;
    afterShow?: () => void | Promise<void>;
    beforeHide?: () => void | Promise<void>;
    afterHide?: () => void | Promise<void>;
    animationMode?: "none" | "both" | "modalOnly";
  }): {
    container: HTMLElement;
    dialog: HTMLDialogElement;
    modalDiv: HTMLDivElement;
  } {
    const { container } = render(() => (
      <AnimatedModal id="Support" {...props} wrapperClass={props.wrapperClass}>
        <div data-testid="modal-content">Test Content</div>
      </AnimatedModal>
    ));

    const dialog = container.querySelector("dialog") as HTMLDialogElement;
    vi.spyOn(dialog, "getClientRects").mockImplementation(
      () =>
        ({
          length: getComputedStyle(dialog).display === "none" ? 0 : 1,
        }) as DOMRectList,
    );

    return {
      // oxlint-disable-next-line no-non-null-assertion
      container: container.children[0]! as HTMLElement,
      dialog,
      // oxlint-disable-next-line no-non-null-assertion
      modalDiv: container.querySelector(".modal")!,
    };
  }

  it("renders dialog with correct id and class", () => {
    const { dialog } = renderModal({});

    expect(dialog).toHaveAttribute("id", "SupportModal");
  });

  it("renders children inside modal div", () => {
    const { modalDiv } = renderModal({});

    expect(
      modalDiv.querySelector("[data-testid='modal-content']"),
    ).toHaveTextContent("Test Content");
  });

  it("doesnt render children if not open", () => {
    hideModal("Support");
    const { modalDiv } = renderModal({});

    expect(modalDiv).not.toBeInTheDocument();
  });

  it("has escape handler attached", () => {
    const { dialog } = renderModal({});

    expect(dialog.onkeydown).toBeDefined();
  });

  it("has backdrop click handler attached", () => {
    const { dialog } = renderModal({});

    expect(dialog.onmousedown).toBeDefined();
  });

  it("applies custom class to dialog", () => {
    const { dialog } = renderModal({
      wrapperClass: "customClass",
    });

    expect(dialog).toHaveClass("customClass");
  });

  it("renders with animationMode none", () => {
    const { dialog } = renderModal({
      animationMode: "none",
    });

    expect(dialog).toHaveAttribute("id", "SupportModal");
  });

  it("opens the native dialog after preparation", async () => {
    const beforeShow = vi.fn();
    const afterShow = vi.fn();
    const { dialog } = renderModal({ beforeShow, afterShow });

    await waitFor(() => expect(dialog.open).toBe(true));
    expect(beforeShow).toHaveBeenCalledOnce();
    expect(afterShow).not.toHaveBeenCalled();
    await completeAnimation();
    expect(afterShow).toHaveBeenCalledOnce();
  });

  it("closes the native dialog when its exit animation finishes", async () => {
    const afterHide = vi.fn();
    const { dialog } = renderModal({ afterHide });
    await waitFor(() => expect(dialog.open).toBe(true));
    await completeAnimation();

    hideModal("Support");
    await waitFor(() => expect(animations).toHaveLength(4));
    expect(dialog.open).toBe(true);
    expect(afterHide).not.toHaveBeenCalled();
    await completeAnimation();

    expect(dialog.open).toBe(false);
    expect(afterHide).toHaveBeenCalledOnce();
  });

  it("closes without animation when animationMode is none", async () => {
    const afterHide = vi.fn();
    const { dialog } = renderModal({ animationMode: "none", afterHide });
    await waitFor(() => expect(dialog.open).toBe(true));

    hideModal("Support");
    await waitFor(() => expect(dialog.open).toBe(false));
    expect(afterHide).toHaveBeenCalledOnce();
    expect(animations).toHaveLength(0);
  });

  it("closes an open native dialog on unmount", async () => {
    const { dialog } = renderModal({});
    await waitFor(() => expect(dialog.open).toBe(true));

    cleanup();

    expect(dialog.open).toBe(false);
  });

  it("keeps an unopened dialog out of overlay detection", () => {
    hideModal("Support");
    const { dialog } = renderModal({});

    expect(getComputedStyle(dialog).display).toBe("none");
    expect(isAnyPopupVisible()).toBe(false);
  });

  it.each(["both", "modalOnly", "none"] as const)(
    "stays hidden after reactive afterHide updates (%s)",
    async (animationMode) => {
      const [wrapperClass, setWrapperClass] = createSignal("bg-transparent");
      const { dialog } = renderModal({
        animationMode,
        get wrapperClass() {
          return wrapperClass();
        },
        afterHide: () => {
          setWrapperClass("");
        },
      });
      await waitFor(() => expect(dialog.open).toBe(true));
      if (animationMode !== "none") await completeAnimation();
      expect(isAnyPopupVisible()).toBe(true);
      animations.length = 0;

      hideModal("Support");
      if (animationMode !== "none") {
        await waitFor(() => expect(animations.length).toBeGreaterThan(0));
        await completeAnimation();
      }
      await waitFor(() => expect(dialog.open).toBe(false));

      expect(getComputedStyle(dialog).display).toBe("none");
      expect(isAnyPopupVisible()).toBe(false);
      setWrapperClass("bg-transparent");
      expect(isAnyPopupVisible()).toBe(false);

      showModal("Support");
      await waitFor(() => expect(dialog.open).toBe(true));
      expect(getComputedStyle(dialog).display).toBe("flex");
    },
  );
});
