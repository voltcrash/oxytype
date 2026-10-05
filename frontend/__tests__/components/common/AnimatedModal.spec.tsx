import { cleanup, render, waitFor } from "@solidjs/testing-library";
import { AnimationParams } from "animejs";
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

async function completeAnimation(): Promise<void> {
  // @ts-expect-error callback arguments unused by modal lifecycle
  await animations.at(-1)?.params.onComplete?.();
}

describe("AnimatedModal", () => {
  beforeEach(() => {
    hideModalAndClearChain("Support");
    showModal("Support");
    vi.clearAllMocks();
    animations.length = 0;

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
      <AnimatedModal id="Support" {...props}>
        <div data-testid="modal-content">Test Content</div>
      </AnimatedModal>
    ));

    return {
      // oxlint-disable-next-line no-non-null-assertion
      container: container.children[0]! as HTMLElement,
      // oxlint-disable-next-line no-non-null-assertion
      dialog: container.querySelector("dialog")!,
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
});
