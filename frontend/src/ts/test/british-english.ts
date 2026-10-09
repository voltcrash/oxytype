import { replace as replaceWord } from "@oxytype/typing-core/british-english";
import { Config } from "../config/store";

export async function replace(
  word: string,
  previousWord: string | undefined,
): Promise<string> {
  return replaceWord(word, previousWord, Config.mode);
}
