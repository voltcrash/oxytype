import Page from "./page";
import { qsr } from "../utils/dom";

export {
  updateBar,
  updateText,
  showSpinner,
  showError,
  showBar,
} from "../states/loading-page";

export const page = new Page({
  id: "loading",
  element: () => qsr("#pageLoading"),
  path: "/",
});
