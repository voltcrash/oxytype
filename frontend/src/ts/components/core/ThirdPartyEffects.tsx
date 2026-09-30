import { createEffect, JSXElement, onCleanup, onMount, Show } from "solid-js";

import { useRef } from "../../hooks/useRef";
import {
  getRampScriptUrl,
  isAnalyticsMarkupEnabled,
  isEgMarkupEnabled,
} from "../../states/third-party";

// HTML parsing preserves the legacy insertion's inert script behavior.
const ANALYTICS_HTML = `
    <script
    async
    src="https://www.googletagmanager.com/gtag/js?id=UA-165993088-1"
  ></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());

    gtag("config", "UA-165993088-1");
  </script>`;
const EG_HEAD_HTML = `<script>
  !function(e){var s=new XMLHttpRequest;s.open("GET","https://api.enthusiastgaming.net/scripts/cdn.enthusiast.gg/script/eg-aps/release/eg-aps-bootstrap-v2.0.0.bundle.js?site=monkeytype.com",!0),s.onreadystatechange=function(){var t;4==s.readyState&&(200<=s.status&&s.status<300||304==s.status)&&((t=e.createElement("script")).type="text/javascript",t.text=s.responseText,e.head.appendChild(t))},s.send(null)}(document);
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-W7WN5QV');
  </script>`;
const EG_BODY_HTML = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-W7WN5QV"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;

function EgFallback(): JSXElement {
  const [ref, element] = useRef<HTMLDivElement>();
  // Parse after adoption into the live document: detached Solid templates have
  // scripting disabled and would turn the noscript text into an active iframe.
  onMount(() => element()?.insertAdjacentHTML("afterbegin", EG_BODY_HTML));
  return <div class="contents" ref={ref}></div>;
}

export function ThirdPartyEffects(): JSXElement {
  createEffect(() => {
    if (!isEgMarkupEnabled()) return;
    document.head.insertAdjacentHTML("beforeend", EG_HEAD_HTML);
    const script = document.head.lastElementChild;
    onCleanup(() => script?.remove());
  });
  createEffect(() => {
    const url = getRampScriptUrl();
    if (url === undefined) return;
    const script = document.createElement("script");
    script.setAttribute("async", "true");
    script.src = url;
    document.head.appendChild(script);
    onCleanup(() => script.remove());
  });
  return (
    <>
      <Show when={isAnalyticsMarkupEnabled()}>
        {/* Fixed trusted markup; parsing must keep these scripts inert. */}
        {/* oxlint-disable-next-line solid/no-innerhtml */}
        <div class="contents" innerHTML={ANALYTICS_HTML}></div>
      </Show>
      <Show when={isEgMarkupEnabled()}>
        <EgFallback />
      </Show>
    </>
  );
}
