import type { ScreenId } from "./screens";

export type ScreenStack = readonly [ScreenId, ...ScreenId[]];

function toStack(
  screens: readonly ScreenId[],
  fallback: ScreenId,
): ScreenStack {
  const [root = fallback, ...rest] = screens;
  return [root, ...rest];
}

export function currentScreen(stack: ScreenStack): ScreenId {
  return stack.at(-1) ?? stack[0];
}

/** Opens a screen; opening a screen already on the stack unwinds to it. */
export function pushScreen(stack: ScreenStack, screen: ScreenId): ScreenStack {
  const index = stack.indexOf(screen);
  if (index === -1) return [...stack, screen];
  return toStack(stack.slice(0, index + 1), screen);
}

export function replaceScreen(
  stack: ScreenStack,
  screen: ScreenId,
): ScreenStack {
  const below = popScreen(stack);
  return below === undefined ? [screen] : pushScreen(below, screen);
}

/** Returns undefined at the root so callers can decide what back means. */
export function popScreen(stack: ScreenStack): ScreenStack | undefined {
  if (stack.length === 1) return undefined;
  return toStack(stack.slice(0, -1), stack[0]);
}
