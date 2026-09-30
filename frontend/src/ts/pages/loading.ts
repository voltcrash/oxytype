import Page from "./page";
import * as Skeleton from "../utils/skeleton";
import { ElementWithUtils } from "../utils/dom";

export {
  updateBar,
  updateText,
  showSpinner,
  showError,
  showBar,
} from "../states/loading-page";

export const page = new Page({
  id: "loading",
  element: () => new ElementWithUtils(Skeleton.get("pageLoading")),
  path: "/",
  afterHide: async (): Promise<void> => {
    Skeleton.remove("pageLoading");
  },
  beforeShow: async (): Promise<void> => {
    Skeleton.append("pageLoading", "main");
  },
});
