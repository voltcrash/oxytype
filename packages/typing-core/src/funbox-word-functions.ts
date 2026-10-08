import { Config, FunboxName } from "@oxytype/schemas/configs";
import { Language, LanguageObject } from "@oxytype/schemas/languages";
import { ActiveFunbox, FunboxWordFunctions } from "./active-funboxes";
import { FunboxWordsFrequency, PolyglotWordset, Wordset } from "./wordset";
import * as GetText from "./generate";
import * as Numerals from "./numerals";
import * as Strings from "./strings";
import * as Arrays from "./arrays";
import * as IPAddresses from "./ip-addresses";
import { createArrowGenerator } from "./ddr";
import { createWeakSpot } from "./weak-spot";
import { randomIntFromRange } from "@oxytype/util/numbers";
import { Section } from "./languages";
import { WordGenError } from "./errors";
import { getFunboxObject } from "@oxytype/funbox";

export type FunboxWordDeps = {
  getConfig: () => Pick<Config, "language" | "customPolyglot">;
  getLanguage: (language: Language) => Promise<LanguageObject>;
  getPoem: () => Promise<Section | false>;
  getSection: (language: Language) => Promise<Section | false>;
  getWeakSpotWord?: (wordset: Wordset) => string;
  notify?: (message: string, options?: { durationMs?: number }) => void;
  disableFunbox: (name: FunboxName, noRestart?: boolean) => void;
  setLanguage: (language: Language, noSave?: boolean) => void;
};
//todo move to its own file
class CharDistribution {
  public chars: Record<string, number>;
  public count: number;
  constructor() {
    this.chars = {};
    this.count = 0;
  }

  public addChar(char: string): void {
    this.count++;
    if (char in this.chars) {
      (this.chars[char] as number) += 1;
    } else {
      this.chars[char] = 1;
    }
  }

  public randomChar(): string {
    const randomIndex = randomIntFromRange(0, this.count - 1);
    let runningCount = 0;
    for (const [char, charCount] of Object.entries(this.chars)) {
      runningCount += charCount;
      if (runningCount > randomIndex) {
        return char;
      }
    }

    return Object.keys(this.chars)[0] as string;
  }
}
const prefixSize = 2;
class PseudolangWordGenerator extends Wordset {
  public ngrams: Record<string, CharDistribution> = {};
  constructor(words: string[]) {
    super(words);
    // Can generate an unbounded number of words in theory.
    this.length = Infinity;

    for (let word of words) {
      // Mark the end of each word with a space.
      word += " ";
      let prefix = "";
      for (const c of word) {
        // Add `c` to the distribution of chars that can come after `prefix`.
        if (!(prefix in this.ngrams)) {
          this.ngrams[prefix] = new CharDistribution();
        }
        (this.ngrams[prefix] as CharDistribution).addChar(c);
        prefix = (prefix + c).slice(-prefixSize);
      }
    }
  }

  public override randomWord(): string {
    let word = "";
    for (;;) {
      const prefix = word.slice(-prefixSize);
      const charDistribution = this.ngrams[prefix];
      if (!charDistribution) {
        // This shouldn't happen if this.ngrams is complete. If it does
        // somehow, start generating a new word.
        word = "";
        continue;
      }
      // Pick a random char from the distribution that comes after `prefix`.
      const nextChar = charDistribution.randomChar();
      if (nextChar === " ") {
        // A space marks the end of the word, so stop generating and return.
        break;
      }
      word += nextChar;
    }
    return word;
  }
}

export function createFunboxWordFunctions(
  deps: FunboxWordDeps,
): Partial<Record<FunboxName, FunboxWordFunctions>> {
  const DDR = createArrowGenerator();
  const weakSpotWord = deps.getWeakSpotWord ?? createWeakSpot().getWord;
  return {
    "58008": {
      getWord(): string {
        let num = GetText.getNumbers(7);
        if (deps.getConfig().language.startsWith("kurdish")) {
          num = Numerals.convertNumberToArabic(num);
        } else if (deps.getConfig().language.startsWith("nepali")) {
          num = Numerals.convertNumberToNepali(num);
        }
        return num;
      },
      punctuateWord(word: string): string {
        if (word.length > 3) {
          if (Math.random() < 0.5) {
            word = Strings.replaceCharAt(
              word,
              randomIntFromRange(1, word.length - 2),
              ".",
            );
          }
          if (Math.random() < 0.75) {
            const index = randomIntFromRange(1, word.length - 2);
            if (
              word[index - 1] !== "." &&
              word[index + 1] !== "." &&
              word[index + 1] !== "0"
            ) {
              const special = Arrays.randomElementFromArray([
                "/",
                "*",
                "-",
                "+",
              ]);
              word = Strings.replaceCharAt(word, index, special);
            }
          }
        }
        return word;
      },
    },
    arrows: {
      getWord(_wordset, wordIndex): string {
        return DDR.chart2Word(wordIndex === 0);
      },
    },
    rAnDoMcAsE: {
      alterText(word: string): string {
        let randomCaseWord = "";

        for (let letter of word) {
          if (Math.random() < 0.5) {
            randomCaseWord += letter.toUpperCase();
          } else {
            randomCaseWord += letter.toLowerCase();
          }
        }

        return randomCaseWord;
      },
    },
    sPoNgEcAsE: {
      alterText(word: string): string {
        let spongeCaseWord = "";

        for (let i = 0; i < word.length; i++) {
          if (i % 2 === 0) {
            spongeCaseWord += word[i]?.toLowerCase();
          } else {
            spongeCaseWord += word[i]?.toUpperCase();
          }
        }

        return spongeCaseWord;
      },
    },
    rot13: {
      alterText(word: string): string {
        let alphabet = "abcdefghijklmnopqrstuvwxyz";

        let rot13Word = "";

        for (let ch of word) {
          let chIndex = alphabet.indexOf(ch.toLowerCase());
          if (chIndex === -1) {
            rot13Word += ch;
            continue;
          }

          let rot13Ch = (chIndex + 13) % 26;
          if (ch.toUpperCase() === ch) {
            rot13Word += alphabet[rot13Ch]?.toUpperCase();
          } else {
            rot13Word += alphabet[rot13Ch];
          }
        }

        return rot13Word;
      },
    },
    backwards: {
      alterText(word: string): string {
        return word.split("").reverse().join("");
      },
    },
    capitals: {
      alterText(word: string): string {
        return Strings.capitalizeFirstLetterOfEachWord(word);
      },
    },
    gibberish: {
      getWord(): string {
        return GetText.getGibberish();
      },
    },
    ascii: {
      getWord(): string {
        return GetText.getASCII();
      },
    },
    specials: {
      getWord(): string {
        return GetText.getSpecials();
      },
    },
    poetry: {
      async pullSection(): Promise<Section | false> {
        return deps.getPoem();
      },
    },
    wikipedia: {
      async pullSection(lang?: Language): Promise<Section | false> {
        return deps.getSection((lang ?? "") || "english");
      },
    },
    weakspot: {
      getWord(wordset?: Wordset): string {
        if (wordset !== undefined) return weakSpotWord(wordset);
        else return "";
      },
    },
    pseudolang: {
      async withWords(words?: string[]): Promise<Wordset> {
        if (words !== undefined) return new PseudolangWordGenerator(words);
        return new Wordset([]);
      },
    },
    IPv4: {
      getWord(): string {
        return IPAddresses.getRandomIPv4address();
      },
      punctuateWord(word: string): string {
        let w = word;
        if (Math.random() < 0.25) {
          w = IPAddresses.addressToCIDR(word);
        }
        return w;
      },
    },
    IPv6: {
      getWord(): string {
        return IPAddresses.getRandomIPv6address();
      },
      punctuateWord(word: string): string {
        let w = word;
        if (Math.random() < 0.25) {
          w = IPAddresses.addressToCIDR(word);
        }
        // Compress
        if (w.includes(":")) {
          w = IPAddresses.compressIpv6(w);
        }
        return w;
      },
    },
    binary: {
      getWord(): string {
        return GetText.getBinary();
      },
    },
    hexadecimal: {
      getWord(): string {
        return GetText.getHexadecimal();
      },
      punctuateWord(word: string): string {
        return `0x${word}`;
      },
    },
    zipf: {
      getWordsFrequencyMode(): FunboxWordsFrequency {
        return "zipf";
      },
    },
    ddoouubblleedd: {
      alterText(word: string): string {
        return word.replace(/./gu, "$&$&");
      },
    },
    instant_messaging: {
      alterText(word: string): string {
        return word
          .toLowerCase()
          .replace(/[.!?]$/g, "\n") //replace .?! with enter
          .replace(/[().'"]/g, "") //remove special characters
          .replace(/\n+/g, "\n"); //make sure there is only one enter
      },
    },
    morse: {
      alterText(word: string): string {
        return GetText.getMorse(word);
      },
    },
    underscore_spaces: {
      alterText(word: string, wordIndex: number, limit: number): string {
        if (wordIndex === limit - 1) return word; // don't add underscore to the last word
        return `${word}_`;
      },
    },
    ALL_CAPS: {
      alterText(word: string): string {
        return word.toUpperCase();
      },
    },
    polyglot: {
      async withWords(_words) {
        const promises = deps.getConfig().customPolyglot.map(async (language) =>
          deps.getLanguage(language).catch(() => {
            deps.notify?.(
              `Failed to load language: ${language}. It will be ignored.`,
            );
            return null;
          }),
        );

        const languages = (await Promise.all(promises)).filter(
          (lang): lang is LanguageObject => lang !== null,
        );

        if (languages.length === 0) {
          deps.disableFunbox("polyglot");
          throw new Error(
            `No valid languages found. Please check your polyglot languages config (${deps
              .getConfig()
              .customPolyglot.join(", ")}).`,
          );
        }

        if (languages.length === 1) {
          const lang = languages[0] as LanguageObject;
          deps.setLanguage(lang.name, true);
          deps.disableFunbox("polyglot", true);
          deps.notify?.(
            `Disabled polyglot funbox because only one valid language was found. Check your polyglot languages config (${deps
              .getConfig()
              .customPolyglot.join(", ")}).`,
            {
              durationMs: 7000,
            },
          );
          throw new WordGenError("");
        }

        // direction conflict check
        const allRightToLeft = languages.every((lang) => lang.rightToLeft);
        const allLeftToRight = languages.every((lang) => !lang.rightToLeft);
        const mainLanguage = await deps.getLanguage(deps.getConfig().language);
        const mainLanguageIsRTL = mainLanguage?.rightToLeft ?? false;
        if (
          (mainLanguageIsRTL && allLeftToRight) ||
          (!mainLanguageIsRTL && allRightToLeft)
        ) {
          const fallbackLanguage =
            languages[0]?.name ?? (allRightToLeft ? "arabic" : "english");
          deps.setLanguage(fallbackLanguage);
          deps.notify?.(
            `Language direction conflict: switched to ${fallbackLanguage} for consistency.`,
            { durationMs: 5000 },
          );
          throw new WordGenError("");
        }

        // build languageProperties
        const languageProperties = new Map(
          languages.map((lang) => [
            lang.name,
            {
              noLazyMode: lang.noLazyMode,
              joiningScript: lang.joiningScript,
              rightToLeft: lang.rightToLeft,
              additionalAccents: lang.additionalAccents,
            },
          ]),
        );

        const wordsWithLanguage = new Map(
          languages.flatMap((lang) =>
            lang.words.map((word) => [word, lang.name]),
          ),
        );

        return new PolyglotWordset(wordsWithLanguage, languageProperties);
      },
    },
  };
}

export function getWordFunboxes(
  names: FunboxName[],
  functions: Partial<Record<FunboxName, FunboxWordFunctions>>,
): ActiveFunbox[] {
  const metadata = getFunboxObject();
  return names.map((name) => ({
    ...metadata[name],
    functions: functions[name],
  }));
}
