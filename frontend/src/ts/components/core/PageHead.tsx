import { createEffect, JSXElement, onCleanup } from "solid-js";

import { getOpenGraphUrl, getPageTitle } from "../../states/page-head";

export function PageHead(): JSXElement {
  let ownedMeta: HTMLMetaElement | undefined;
  createEffect(() => {
    const url = getOpenGraphUrl();
    if (url === undefined) return;
    let meta = document.head.querySelector<HTMLMetaElement>(
      'meta[property="og:url"]',
    );
    if (meta === null) {
      meta = document.createElement("meta");
      meta.setAttribute("property", "og:url");
      document.head.appendChild(meta);
      ownedMeta = meta;
    }
    meta.content = url;
  });
  createEffect(() => {
    const title = getPageTitle();
    if (title !== undefined) document.title = title;
  });
  onCleanup(() => ownedMeta?.remove());
  return null;
}
