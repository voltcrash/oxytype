import { showVideoAdPopup } from "../components/popups/VideoAdPopup";
import { onDOMReady, qs } from "../utils/dom";

onDOMReady(() => {
  const testPage = qs(".pageTest");

  testPage?.onChild("click", "#watchVideoAdButton", () => {
    void showVideoAdPopup();
  });
});
