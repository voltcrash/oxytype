import { Ads } from "@monkeytype/schemas/configs";
import { JSXElement, Show, untrack } from "solid-js";

import { Config, getConfig } from "../../config/store";
import { cn } from "../../utils/cn";

export function Advertisement(props: {
  id:
    | "ad-account-1"
    | "ad-account-2"
    | "ad-about-1"
    | "ad-about-2"
    | "ad-footer"
    | "ad-result"
    | "ad-vertical-left"
    | "ad-vertical-right";
  visible: Ads | Ads[];
  // ad-controller removes these slots itself when the ads setting changes, so
  // only the setting at mount decides whether they render (read from Config,
  // same as ad-controller)
  staticVisibility?: true;
  vertical?: true;
  // text slot ad-controller fills when ads are blocked
  withText?: true;
  // toggled by test/focus.ts
  focus?: true;
  class?: string;
  smallClass?: string;
}): JSXElement {
  const matches = (ads: Ads): boolean =>
    Array.isArray(props.visible)
      ? props.visible.includes(ads)
      : props.visible === ads;
  const initiallyVisible = untrack(() => matches(Config.ads));
  const shown = () =>
    props.staticVisibility ? initiallyVisible : matches(getConfig.ads);

  return (
    <Show when={shown()}>
      <Show
        when={!props.vertical}
        fallback={
          <div
            id={`${props.id}-wrapper`}
            class={cn("ad advertisement ad-v", props.focus && "focus")}
          >
            <div class="icon">
              <i class="fas fa-ad"></i>
            </div>
            <div id={props.id}></div>
          </div>
        }
      >
        <div
          id={`${props.id}-wrapper`}
          class={cn(
            "ad full-width advertisement ad-h place-self-center",
            props.focus && "focus",
            props.class,
          )}
        >
          <Show
            when={props.withText}
            fallback={
              <div class="icon">
                <i class="fas fa-ad"></i>
              </div>
            }
          >
            <div class="iconAndText">
              <div class="icon">
                <i class="fas fa-ad"></i>
              </div>
              <div class="text textRight"></div>
            </div>
          </Show>
          <div id={props.id}></div>
        </div>
        <div
          id={`${props.id}-small-wrapper`}
          class={cn(
            "ad advertisement ad-h-s place-self-center",
            props.focus && "focus",
            props.smallClass,
          )}
        >
          <div class="icon small">
            <i class="fas fa-ad"></i>
          </div>
          <div id={`${props.id}-small`}></div>
        </div>
      </Show>
    </Show>
  );
}
