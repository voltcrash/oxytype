import Page from "./page";

export {
  updateBar,
  updateText,
  showSpinner,
  showError,
  showBar,
} from "../states/loading-page";

export const page = new Page({
  id: "loading",
  path: "/",
});
