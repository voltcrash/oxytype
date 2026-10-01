import { JSXElement, onCleanup, onMount, ParentProps } from "solid-js";

import { useRef } from "../../hooks/useRef";
import { convertRemToPixels } from "../../utils/numbers";

export function AutoShrink(
  props: ParentProps & { class?: string; upperLimitRem: number },
): JSXElement {
  const [ref, el] = useRef<HTMLElement>();

  let resizeObserver: ResizeObserver | undefined;

  const updateFontSize = (element: HTMLElement) => {
    const parent = element.parentElement;
    if (!parent) return;

    const parentWidth = parent.clientWidth;
    if (parentWidth === 0) return;

    const upperLimit = convertRemToPixels(props.upperLimitRem);

    // Temporarily set base size for measurement
    element.style.fontSize = "10px";

    const widthAt10 = element.clientWidth;
    if (widthAt10 === 0) return;

    const fittedFontSize = (parentWidth / widthAt10) * 10;
    const finalFontSize = Math.min(Math.max(fittedFontSize, 10), upperLimit);

    resizeObserver?.disconnect();

    element.style.fontSize = `${finalFontSize}px`;
  };

  onMount(() => {
    const element = el();
    if (!element) return;

    const parent = element.parentElement;
    if (!parent) return;

    resizeObserver = new ResizeObserver(() => {
      updateFontSize(element);
    });

    resizeObserver.observe(parent);

    updateFontSize(element);
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
  });

  return (
    <div ref={ref} class={props.class}>
      {props.children}
    </div>
  );
}
