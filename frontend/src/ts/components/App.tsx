import { QueryClientProvider } from "@tanstack/solid-query";
import { JSXElement } from "solid-js";
import { Portal } from "solid-js/web";

import { getFocus } from "../states/test";
import { cn } from "../utils/cn";
import { queryClient } from "../queries";
import { Advertisement } from "./common/Advertisement";
import { AppEffects, AppElements } from "./core/AppEffects";
import { Theme } from "./core/Theme";
import { DevTools } from "./dev/DevTools";
import { Footer } from "./layout/footer/Footer";
import { Header } from "./layout/header/Header";
import { Overlays } from "./layout/overlays/Overlays";
import { Modals } from "./modals/Modals";
import { AppPages } from "./pages/AppPages";
import { BarTimerProgress } from "./pages/test/live-stats/BarTimerProgress";
import { MonkeyPower } from "./pages/test/MonkeyPower";
import { Popups } from "./popups/Popups";

export function App(props: AppElements): JSXElement {
  return (
    <QueryClientProvider client={queryClient}>
      <Portal mount={props.body}>
        <AppEffects {...props} />
        <Overlays />
        <Theme />
        <BarTimerProgress />
        <div id="solidmodals">
          <Modals />
        </div>
        <div id="solidpopups">
          <Popups />
        </div>
        <DevTools />
        <MonkeyPower />
      </Portal>
      <Header />
      <main class={cn("full-width content-grid h-full", getFocus() && "focus")}>
        <Advertisement
          id="ad-vertical-left"
          visible={["on", "sellout"]}
          staticVisibility
          vertical
          focus
        />
        <Advertisement
          id="ad-vertical-right"
          visible={["on", "sellout"]}
          staticVisibility
          vertical
          focus
        />
        <AppPages />
      </main>
      <Footer />
      <Advertisement
        id="ad-footer"
        visible="sellout"
        staticVisibility
        focus
        class="col-[full-width]"
        smallClass="col-[content]"
      />
    </QueryClientProvider>
  );
}
