import { getAllFunboxes } from "@oxytype/funbox";
import type { FunboxName } from "@oxytype/schemas/configs";

const wordHooks = new Set([
  "getWord",
  "alterText",
  "withWords",
  "pullSection",
  "getWordsFrequencyMode",
]);
export const wordFunboxes = new Set<FunboxName>(
  getAllFunboxes()
    .filter(
      (box) =>
        box.frontendFunctions?.some((hook) => wordHooks.has(hook)) === true,
    )
    .map((box) => box.name),
);
export const terminalFunboxes = new Set<FunboxName>([
  ...wordFunboxes,
  "nospace",
  "no_quit",
]);
