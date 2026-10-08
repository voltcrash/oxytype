import * as Core from "@oxytype/typing-core/input/validation";
import { Config } from "../../config/store";
export function isCharCorrect(
  options: Parameters<typeof Core.isCharCorrect>[0],
): boolean {
  return Core.isCharCorrect(options, Config);
}
export function shouldGoToNextWord(
  options: Parameters<typeof Core.shouldGoToNextWord>[0],
): boolean {
  return Core.shouldGoToNextWord(options, Config);
}
