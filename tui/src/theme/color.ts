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
