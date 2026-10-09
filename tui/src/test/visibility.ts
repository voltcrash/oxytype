import type { FunboxName } from "@oxytype/schemas/configs";

/** Terminal cells retain their width and caret slots while hidden. */
export function hideWord(
  names: readonly FunboxName[],
  word: number,
  active: number,
  untyped: boolean,
  memoryHidden: boolean,
): boolean {
  if (names.includes("memory") && memoryHidden) return true;
  if (!untyped) return false;
  for (const [name, future] of [
    ["plus_zero", 0],
    ["plus_one", 1],
    ["plus_two", 2],
    ["plus_three", 3],
  ] as const) {
    if (names.includes(name) && word > active + future) return true;
  }
  if (active === 0) return false;
  for (const [name, ahead] of [
    ["read_ahead_easy", 0],
    ["read_ahead", 1],
    ["read_ahead_hard", 2],
  ] as const) {
    if (names.includes(name) && word >= active && word <= active + ahead) {
      return true;
    }
  }
  return false;
}
