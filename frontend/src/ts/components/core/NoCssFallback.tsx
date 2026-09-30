import { onMount } from "solid-js";
import { envConfig } from "virtual:env-config";

// The static fallback must remain usable without the app stylesheet (§2).
export function NoCssFallback(props: { element: HTMLElement | null }): null {
  onMount(() => {
    const setHtml = (selector: string, html: string): void => {
      const element = props.element?.querySelector(selector);
      if (element !== undefined && element !== null) element.innerHTML = html;
    };
    setHtml(
      ".requestedStylesheets",
      `Requested stylesheets:<br>${(
        [
          ...document.querySelectorAll("link[rel=stylesheet"),
        ] as HTMLAnchorElement[]
      )
        .map((l) => l.href)
        .filter((l) => /\/css\/style/gi.test(l))
        .join("<br>")}`,
    );

    setHtml(
      ".requestedJs",
      `Requested Javascript files:<br>${(
        [...document.querySelectorAll("script")] as HTMLScriptElement[]
      )
        .map((l) => l.src)
        .filter((l) => /(\/js\/mon|\/js\/vendor)/gi.test(l))
        .join("<br>")}<br><br>Client version:<br>${envConfig.clientVersion}`,
    );

    if (window.navigator.userAgent.toLowerCase().includes("mac")) {
      setHtml(
        ".keys",
        `
        <span
          style="
            padding: 1rem;
            display: inline-block;
            border-radius: 1rem;
            background: #2c2e31;
            margin-top: 1rem;
            margin-bottom: 1rem;
          "
        >
          Cmd
        </span>
        +
        <span
          style="
            padding: 1rem;
            display: inline-block;
            border-radius: 1rem;
            background: #2c2e31;
          "
        >
          Shift
        </span>
        +
        <span
          style="
            padding: 1rem;
            display: inline-block;
            border-radius: 1rem;
            background: #2c2e31;
          "
        >
          R
        </span>
      `,
      );
    } else {
      setHtml(
        ".keys",
        `
        <span
          style="
            padding: 1rem;
            display: inline-block;
            border-radius: 1rem;
            background: #2c2e31;
            margin-bottom: 1rem;
          "
        >
          Ctrl
        </span>
        +
        <span
          style="
            padding: 1rem;
            display: inline-block;
            border-radius: 1rem;
            background: #2c2e31;
          "
        >
          Shift
        </span>
        +
        <span
          style="
            padding: 1rem;
            display: inline-block;
            border-radius: 1rem;
            background: #2c2e31;
          "
        >
          R
        </span>
      `,
      );
    }
  });
  return null;
}
