import { JSXElement } from "solid-js";

import Ape from "../../../../ape";
import * as DB from "../../../../db";
import { hideLoaderBar, showLoaderBar } from "../../../../states/loader-bar";
import {
  addNotificationWithLevel,
  showErrorNotification,
} from "../../../../states/notifications";
import { showQuoteRateModal } from "../../../../states/quote-rate";
import { showQuoteReportModal } from "../../../../states/quote-report";
import { resultState, setResultState } from "../../../../states/result";
import { getCurrentQuote } from "../../../../states/test";
import { cn } from "../../../../utils/cn";
import { Fa } from "../../../common/Fa";

async function toggleFavorite(): Promise<void> {
  const { language: quoteLang, id: quoteId, favorite } = resultState.quote;
  if (quoteLang === undefined || quoteId === "") {
    showErrorNotification("Could not get quote stats!");
    return;
  }

  const dbSnapshot = DB.getSnapshot();
  if (!dbSnapshot) return;

  if (favorite) {
    // Remove from
    showLoaderBar();
    const response = await Ape.users.removeQuoteFromFavorites({
      body: {
        language: quoteLang,
        quoteId,
      },
    });
    hideLoaderBar();

    addNotificationWithLevel(
      response.body.message,
      response.status === 200 ? "success" : "error",
    );

    if (response.status === 200) {
      setResultState("quote", "favorite", false);
      const quoteIndex = dbSnapshot.favoriteQuotes?.[quoteLang]?.indexOf(
        quoteId,
      ) as number;
      dbSnapshot.favoriteQuotes?.[quoteLang]?.splice(quoteIndex, 1);
    }
  } else {
    // Add to favorites
    showLoaderBar();
    const response = await Ape.users.addQuoteToFavorites({
      body: { language: quoteLang, quoteId },
    });
    hideLoaderBar();

    addNotificationWithLevel(
      response.body.message,
      response.status === 200 ? "success" : "error",
    );

    if (response.status === 200) {
      setResultState("quote", "favorite", true);
      dbSnapshot.favoriteQuotes ??= {};
      dbSnapshot.favoriteQuotes[quoteLang] ??= [];
      dbSnapshot.favoriteQuotes[quoteLang]?.push(quoteId);
    }
  }
}

export function ResultQuoteActions(): JSXElement {
  const quote = () => resultState.quote;

  return (
    <>
      <span
        id="reportQuoteButton"
        class={cn("textButton px-1 py-0", !quote().reportVisible && "hidden")}
        aria-label="Report quote"
        data-balloon-pos="up"
        onClick={() => {
          const currentQuote = getCurrentQuote();
          if (currentQuote === null) {
            showErrorNotification(
              "Failed to show quote report popup: no quote",
            );
            return;
          }
          showQuoteReportModal(currentQuote.id);
        }}
      >
        <Fa icon="fa-flag" fixedWidth class="icon" />
      </span>
      <span
        id="favoriteQuoteButton"
        class={cn("textButton px-1 py-0", !quote().favoriteVisible && "hidden")}
        aria-label="Favorite quote"
        data-balloon-pos="up"
        onClick={() => void toggleFavorite()}
      >
        <Fa
          icon="fa-heart"
          variant={quote().favorite ? "solid" : "regular"}
          fixedWidth
          class="icon"
        />
      </span>
      <span
        id="rateQuoteButton"
        class={cn(
          "textButton gap-1 px-1 py-0",
          !quote().rateVisible && "hidden",
        )}
        aria-label="Rate quote"
        data-balloon-pos="up"
        onClick={() => {
          const currentQuote = getCurrentQuote();
          if (currentQuote === null) {
            showErrorNotification(
              "Failed to show quote rating popup: no quote",
            );
            return;
          }
          showQuoteRateModal(currentQuote);
        }}
      >
        <Fa
          icon="fa-star"
          variant={quote().rated ? "solid" : "regular"}
          fixedWidth
          class="icon"
        />
        <span class="rating">{quote().rating}</span>
      </span>
    </>
  );
}
