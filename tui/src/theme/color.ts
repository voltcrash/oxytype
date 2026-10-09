export type Rgb = { r: number; g: number; b: number };
export type Rgba = Rgb & { a: number };

const hexPattern = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Parses `#rgb`, `#rgba`, `#rrggbb` and `#rrggbbaa`; alpha is 0–1. */
export function parseHex(hex: string): Rgba {
  const match = hexPattern.exec(hex);
  if (match?.[1] === undefined) throw new Error(`Invalid hex colour: ${hex}`);
  const digits = match[1];
  const expanded = digits.length <= 4 ? digits.replace(/./g, "$&$&") : digits;
  const channel = (index: number): number =>
    Number.parseInt(expanded.slice(index * 2, index * 2 + 2), 16);
  return {
    r: channel(0),
    g: channel(1),
    b: channel(2),
    a: expanded.length === 8 ? channel(3) / 255 : 1,
  };
}

/** Terminals have no alpha; composite translucent theme colours onto bg. */
export function blend(color: Rgba, background: Rgb): Rgb {
  const mix = (front: number, back: number): number =>
    Math.round(front * color.a + back * (1 - color.a));
  return {
    r: mix(color.r, background.r),
    g: mix(color.g, background.g),
    b: mix(color.b, background.b),
  };
}

export function toHex(color: Rgb): string {
  return `#${[color.r, color.g, color.b]
    .map((it) => it.toString(16).padStart(2, "0"))
    .join("")}`;
}

const cubeLevels = [0, 95, 135, 175, 215, 255];

/** RGB value of an xterm 256-colour index from 16 to 255. */
export function ansi256ToRgb(index: number): Rgb {
  if (index >= 232) {
    const level = 8 + (index - 232) * 10;
    return { r: level, g: level, b: level };
  }
  const cube = index - 16;
  return {
    r: cubeLevels[Math.floor(cube / 36)] ?? 0,
    g: cubeLevels[Math.floor(cube / 6) % 6] ?? 0,
    b: cubeLevels[cube % 6] ?? 0,
  };
}

function distance(a: Rgb, b: Rgb): number {
  // Weighted for perceived brightness.
  return 3 * (a.r - b.r) ** 2 + 4 * (a.g - b.g) ** 2 + 2 * (a.b - b.b) ** 2;
}

/**
 * Nearest xterm colour cube or greyscale index. Indexes 0–15 are skipped:
 * users remap them in terminal themes.
 */
export function nearestAnsi256(color: Rgb): number {
  let best = 16;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 16; index < 256; index++) {
    const candidate = distance(color, ansi256ToRgb(index));
    if (candidate < bestDistance) {
      best = index;
      bestDistance = candidate;
    }
  }
  return best;
}
