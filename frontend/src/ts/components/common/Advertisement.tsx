import { Ads } from "@monkeytype/schemas/configs";
import { createSignal, JSXElement, onCleanup, Show, untrack } from "solid-js";

import { Config, getConfig } from "../../config/store";
import {
  getAdMessage,
  getAdWithLeft,
  getShellAdsVisible,
  registerAdSlot,
  removeAdSlots,
} from "../../states/ads";
import { getIsScreenshotting } from "../../states/core";
import { getFocus } from "../../states/test";
import { cn } from "../../utils/cn";
import { Fa } from "./Fa";

const wrapperClass =
  "ad advertisement grid justify-center bg-sub-alt transition-opacity duration-125 [grid-template-areas:'col'] [&>div]:[grid-area:col]";
const iconClass =
  "icon grid h-full w-full items-center justify-center text-5xl text-sub";

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
  staticVisibility?: true;
  vertical?: true;
  withText?: true;
  focus?: true;
  hideWhileScreenshotting?: true;
  class?: string;
  smallClass?: string;
}): JSXElement {
  const matches = (ads: Ads): boolean =>
    Array.isArray(props.visible)
      ? props.visible.includes(ads)
      : props.visible === ads;
  const initiallyVisible = untrack(() => matches(Config.ads));
  const [removed, setRemoved] = createSignal(false);
  const shown = (): boolean =>
    !removed() &&
    (props.staticVisibility ? initiallyVisible : matches(getConfig.ads));
  removeAdSlots.useListener((ids) => {
    if (shown() && ids.includes(props.id)) setRemoved(true);
  });
  const hidden = (): string =>
    cn(
      props.focus && !getShellAdsVisible() && "testPage hidden!",
      props.focus && getFocus() && "focus opacity-0",
      props.hideWhileScreenshotting && getIsScreenshotting() && "hidden",
    );
  const ref =
    (id: string) =>
    (element: HTMLDivElement): void => {
      onCleanup(registerAdSlot(id, element));
    };
  return (
    <Show when={shown()}>
      <Show
        when={!props.vertical}
        fallback={
          <div
            id={`${props.id}-wrapper`}
            ref={ref(`${props.id}-wrapper`)}
            class={cn(
              wrapperClass,
              "ad-v h-[600px] w-[160px] [@media(width<=1875px)]:hidden",
              hidden(),
            )}
          >
            <div class={iconClass}>
              <Fa icon="fa-ad" />
            </div>
            <div id={props.id}></div>
          </div>
        }
      >
        <div
          id={`${props.id}-wrapper`}
          ref={ref(`${props.id}-wrapper`)}
          class={cn(
            wrapperClass,
            "ad-h full-width h-[90px] w-[728px] place-self-center [@media(width<=calc(640px+5rem))]:hidden",
            props.id === "ad-result" || props.id.startsWith("ad-account")
              ? "mx-auto"
              : "",
            props.class,
            hidden(),
          )}
        >
          <Show
            when={props.withText}
            fallback={
              <div class={iconClass}>
                <Fa icon="fa-ad" />
              </div>
            }
          >
            <div
              class={cn(
                "iconAndText grid grid-cols-[auto_1fr] items-center justify-center gap-4 justify-self-center [grid-template-areas:'mid_right']",
                getAdWithLeft() &&
                  "withLeft grid-cols-[1fr_auto_1fr] [grid-template-areas:'left_mid_right']",
              )}
            >
              <div class={cn(iconClass, "h-auto w-auto [grid-area:mid]")}>
                <Fa icon="fa-ad" />
              </div>
              <div class="text textRight text-base text-sub [grid-area:right]">
                <Show when={getAdMessage()}>
                  {(message) => (
                    <>
                      {message() === "adblock"
                        ? "Using an ad blocker? No worries"
                        : "Ads not working? Ooops"}
                      <div class="smalltext text-[0.7rem]">
                        {message() === "adblock"
                          ? "We understand ads can be annoying"
                          : "You may have a cookie popup blocker enabled - ads will not show without your consent"}
                        <br />
                        {message() === "adblock" ? "You can " : "You can also "}
                        <i>disable all ads</i>
                        {message() === "adblock"
                          ? " in the settings"
                          : " in the settings if you wish"}
                      </div>
                    </>
                  )}
                </Show>
              </div>
            </div>
          </Show>
          <div id={props.id}></div>
        </div>
        <div
          id={`${props.id}-small-wrapper`}
          ref={ref(`${props.id}-small-wrapper`)}
          class={cn(
            wrapperClass,
            "ad-h-s hidden h-[50px] w-[320px] place-self-center [@media(width>355px)_and_(width<=calc(640px+5rem))]:grid",
            props.id === "ad-result" || props.id.startsWith("ad-account")
              ? "mx-auto"
              : "",
            props.smallClass,
            hidden(),
          )}
        >
          <div class={cn(iconClass, "small text-2xl")}>
            <Fa icon="fa-ad" />
          </div>
          <div id={`${props.id}-small`}></div>
        </div>
      </Show>
    </Show>
  );
}
