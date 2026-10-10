import { JSXElement } from "solid-js";

import { LoadingIndicator } from "../common/LoadingIndicator";

// Rendered into index.html at build time, before the application bundle runs.
export function StartupScreen(): JSXElement {
  return (
    <div
      id="startupScreen"
      class="fixed inset-0 z-9999 grid grid-cols-1 place-items-center bg-bg px-8 text-text"
    >
      <div
        class="grid w-full max-w-80 justify-items-center gap-6 text-center"
        role="status"
        aria-live="polite"
      >
        <div
          class="text-[2rem] text-main [font-family:'Lexend_Deca',sans-serif]"
          aria-hidden="true"
        >
          oxytype
        </div>
        <LoadingIndicator />
        <p class="m-0 min-h-5 text-sm text-sub">Loading Oxytype...</p>
      </div>
    </div>
  );
}
