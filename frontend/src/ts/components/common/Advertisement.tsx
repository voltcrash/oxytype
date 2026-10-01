import { Ads } from "@oxytype/schemas/configs";
import { JSXElement } from "solid-js";

export function Advertisement(_props: {
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
  return null;
}
