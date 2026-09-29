import { Config } from "../config/store";
import { __nonReactive } from "../collections/tags";
import {
  showNoticeNotification,
  showErrorNotification,
} from "../states/notifications";
import { showQuoteRateModal } from "../states/quote-rate";
import { showQuoteReportModal } from "../states/quote-report";
import { showModal } from "../states/modals";
import { showVideoAdPopup } from "../components/popups/VideoAdPopup";
import { navigate } from "../controllers/route-controller";
import { getMode2 } from "../utils/misc";
import { qs } from "../utils/dom";
import { getCurrentQuote } from "../states/test";
import { showEditResultTagsModal } from "../states/edit-result-tags";
import { resultState } from "../states/result";

const testPage = qs(".pageTest");

testPage?.onChild("click", ".tags .editTagsButton", () => {
  if (__nonReactive.getTags().length > 0) {
    showEditResultTagsModal({
      _id: resultState.tags.savedResultId ?? "",
      tags: resultState.tags.items.map((tag) => tag.id),
      source: "resultPage",
    });
  }
});

qs(".pageTest #rateQuoteButton")?.on("click", async () => {
  const currentQuote = getCurrentQuote();
  if (currentQuote === null) {
    showErrorNotification("Failed to show quote rating popup: no quote");
    return;
  }
  showQuoteRateModal(currentQuote);
});

qs(".pageTest #reportQuoteButton")?.on("click", async () => {
  const currentQuote = getCurrentQuote();
  if (currentQuote === null) {
    showErrorNotification("Failed to show quote report popup: no quote");
    return;
  }
  showQuoteReportModal(currentQuote?.id);
});

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

qs(".pageTest #dailyLeaderboardRank")?.on("click", async () => {
  void navigate(
    `/leaderboards?type=daily&language=${Config.language}&mode2=${getMode2(
      Config,
      null,
    )}&goToUserPage=true`,
  );
});
