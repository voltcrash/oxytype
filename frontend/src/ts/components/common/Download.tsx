import { createSignal, JSXElement, onCleanup, onMount } from "solid-js";

import { useRef } from "../../hooks/useRef";

type DownloadOptions = { filename: string; data: Blob };
let triggerDownload: ((options: DownloadOptions) => void) | undefined;

export function download(options: DownloadOptions): void {
  if (!triggerDownload) throw new Error("Download is not mounted");
  triggerDownload(options);
}

export function Download(): JSXElement {
  const [linkRef, link] = useRef<HTMLAnchorElement>();
  const [target, setTarget] = createSignal({ url: "", filename: "" });
  const trigger = (options: DownloadOptions): void => {
    const url = URL.createObjectURL(options.data);
    setTarget({ url, filename: options.filename });
    link()?.click();
    setTarget({ url: "", filename: "" });
    URL.revokeObjectURL(url);
  };
  onMount(() => (triggerDownload = trigger));
  onCleanup(() => {
    if (triggerDownload === trigger) triggerDownload = undefined;
  });
  return (
    <a
      ref={linkRef}
      class="hidden"
      href={target().url}
      download={target().filename}
    ></a>
  );
}
