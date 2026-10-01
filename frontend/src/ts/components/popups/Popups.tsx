import { JSXElement } from "solid-js";

import { AlertsPopup } from "./alerts/AlertsPopup";
import { VideoAdPopup } from "./VideoAdPopup";

export function Popups(): JSXElement {
  return (
    <>
      <AlertsPopup />
      <VideoAdPopup />
    </>
  );
}
