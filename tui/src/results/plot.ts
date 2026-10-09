/** Braille dot bits for (column, row) inside a 2×4 cell. */
const dots = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
] as const;

export type PlotCell = { char: string; series?: number };

/**
 * Line plot on a braille grid, 2×4 dots per cell. Later series draw over
 * earlier ones and own the cell colour.
 */
export function braillePlot(
  series: readonly (readonly number[])[],
  width: number,
  height: number,
  minimum: number,
  maximum: number,
): PlotCell[][] {
  const columns = Math.max(1, Math.floor(width));
  const rows = Math.max(1, Math.floor(height));
  const bits = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => 0),
  );
  const owner: (number | undefined)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, (): number | undefined => undefined),
  );
  const pixelWidth = columns * 2;
  const pixelHeight = rows * 4;
  const range = Math.max(1, maximum - minimum);
  const set = (x: number, y: number, index: number): void => {
    const row = Math.floor(y / 4);
    const column = Math.floor(x / 2);
    const line = bits[row];
    const owners = owner[row];
    if (line === undefined || owners === undefined) return;
    line[column] = (line[column] ?? 0) | (dots[x % 2]?.[y % 4] ?? 0);
    owners[column] = index;
  };
  series.forEach((values, index) => {
    if (values.length === 0) return;
    let previous: number | undefined;
    for (let x = 0; x < pixelWidth; x++) {
      const at =
        values.length === 1 ? 0 : (x / (pixelWidth - 1)) * (values.length - 1);
      const low = values[Math.floor(at)] ?? 0;
      const high = values[Math.ceil(at)] ?? low;
      const value = low + (high - low) * (at - Math.floor(at));
      const level = Math.round(
        ((Math.min(maximum, Math.max(minimum, value)) - minimum) / range) *
          (pixelHeight - 1),
      );
      const y = pixelHeight - 1 - level;
      const from = previous ?? y;
      for (let fill = Math.min(from, y); fill <= Math.max(from, y); fill++) {
        set(x, fill, index);
      }
      previous = y;
    }
  });
  return bits.map((line, row) =>
    line.map((bit, column) => ({
      char: bit === 0 ? " " : String.fromCodePoint(0x2800 + bit),
      series: owner[row]?.[column],
    })),
  );
}

/** Marks the plot column under each sample that had errors. */
export function errorColumns(
  errors: readonly number[],
  width: number,
): boolean[] {
  const columns = Math.max(1, Math.floor(width));
  const marks = Array.from({ length: columns }, () => false);
  errors.forEach((count, index) => {
    if (count <= 0) return;
    const column =
      errors.length === 1
        ? 0
        : Math.round((index / (errors.length - 1)) * (columns - 1));
    marks[column] = true;
  });
  return marks;
}
