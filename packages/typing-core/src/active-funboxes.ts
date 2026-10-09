import { FunboxName } from "@oxytype/schemas/configs";
import { FunboxProperty } from "@oxytype/funbox";
import { Language } from "@oxytype/schemas/languages";
import { FunboxWordsFrequency, Wordset } from "./wordset";
import { Section } from "./languages";

/**
 * Funbox functions that take part in generating the words. Clients add their
 * own visual/input hooks on top.
 */
export type FunboxWordFunctions = {
  getWord?: (wordset?: Wordset, wordIndex?: number) => string;
  punctuateWord?: (word: string) => string;
  withWords?: (words?: string[]) => Promise<Wordset>;
  alterText?: (word: string, wordIndex: number, wordsBound: number) => string;
  pullSection?: (language?: Language) => Promise<Section | false>;
  getWordsFrequencyMode?: () => FunboxWordsFrequency;
};

export type ActiveFunbox = {
  name: FunboxName;
  properties?: FunboxProperty[];
  functions?: FunboxWordFunctions;
};

type FunboxWithFunction<F extends keyof FunboxWordFunctions> = ActiveFunbox & {
  functions: Record<F, Exclude<FunboxWordFunctions[F], undefined>>;
};

/**
 * Active funboxes implementing the given function.
 */
export function getFunboxesWithFunction<F extends keyof FunboxWordFunctions>(
  funboxes: ActiveFunbox[],
  functionName: F,
): FunboxWithFunction<F>[] {
  return funboxes.filter(
    (fb) => fb.functions?.[functionName] !== undefined,
  ) as FunboxWithFunction<F>[];
}

/**
 * The single active funbox implementing the given function.
 * @returns the funbox if any, `undefined` otherwise.
 * @throws Error if there are multiple funboxes implementing the function name
 */
export function findSingleFunboxWithFunction<
  F extends keyof FunboxWordFunctions,
>(
  funboxes: ActiveFunbox[],
  functionName: F,
): FunboxWithFunction<F> | undefined {
  const matching = getFunboxesWithFunction(funboxes, functionName);
  if (matching.length === 0) return undefined;
  if (matching.length === 1) return matching[0];
  throw new Error(
    `Expecting exactly one funbox implementing "${functionName} but found ${matching.length}`,
  );
}

export function hasFunboxWithProperty(
  funboxes: ActiveFunbox[],
  property: FunboxProperty,
): boolean {
  return funboxes.some((fb) => fb.properties?.includes(property));
}
