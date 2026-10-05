import { JSXElement } from "solid-js";

// Rendered into index.html at build time, before the application bundle runs.
export function StartupScreen(): JSXElement {
  return (
    <div id="startupScreen" class="contents">
      <header class="text-[2rem] text-main [font-family:'Lexend_Deca',sans-serif]">
        oxytype
      </header>
      <main
        class="grid h-full content-center gap-4 text-center"
        role="status"
        aria-live="polite"
      >
        <div
          class="h-2 w-full max-w-80 justify-self-center overflow-hidden rounded bg-sub-alt"
          aria-hidden="true"
        >
          <div class="h-full w-1/2 rounded bg-main motion-safe:animate-pulse"></div>
        </div>
        <p>Loading Oxytype...</p>
      </main>
      <div aria-hidden="true"></div>
    </div>
  );
}
