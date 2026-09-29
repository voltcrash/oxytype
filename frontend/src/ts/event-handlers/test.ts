import { Config } from "../config/store";
import { showNoticeNotification } from "../states/notifications";
import { showModal } from "../states/modals";
import { showVideoAdPopup } from "../components/popups/VideoAdPopup";
import { qs } from "../utils/dom";

const testPage = qs(".pageTest");

testPage?.onChild("click", "#practiseWordsButton", () => {
  if (Config.mode === "zen") {
    showNoticeNotification("Practice words is unsupported in zen mode");
    return;
  }
  showModal("PractiseWords");
});

testPage?.onChild("click", "#watchVideoAdButton", () => {
  void showVideoAdPopup();
});
