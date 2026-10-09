import type { Language, LanguageObject } from "@oxytype/schemas/languages";
import type { FetchJson } from "@oxytype/typing-core/languages";
import { createLanguageLoader } from "@oxytype/typing-core/languages";
import { QuotesController } from "@oxytype/typing-core/quote-source";
import { tryCatch } from "@oxytype/util/trycatch";

import { AssetUnavailableError } from "../assets/source";

/** Always bundled, so a test can start without downloads. */
const fallbackLanguage: Language = "english";

export type LoadedLanguage = {
  language: LanguageObject;
  /** Set when the configured language was unavailable offline. */
  missing?: Language;
};

export type TestSources = {
  loadLanguage: (language: Language) => Promise<LoadedLanguage>;
  quotes: QuotesController;
};

export function createTestSources(fetchJson: FetchJson): TestSources {
  const languages = createLanguageLoader({ fetchJson });
  return {
    loadLanguage: async (language) => {
      const loaded = await tryCatch(languages.getLanguage(language));
      if (loaded.error === null) return { language: loaded.data };
      if (!(loaded.error instanceof AssetUnavailableError)) throw loaded.error;
      return {
        language: await languages.getLanguage(fallbackLanguage),
        missing: language,
      };
    },
    quotes: new QuotesController({ fetchJson, getSnapshot: () => null }),
  };
}
