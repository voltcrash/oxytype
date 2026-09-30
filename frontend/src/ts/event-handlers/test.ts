import { showVideoAdPopup } from "../components/popups/VideoAdPopup";
import { qs } from "../utils/dom";

const testPage = qs(".pageTest");

testPage?.onChild("click", "#watchVideoAdButton", () => {
  void showVideoAdPopup();
});
