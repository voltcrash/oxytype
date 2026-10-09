import type { PSA } from "@oxytype/schemas/psas";

/** Render server HTML as readable terminal text, keeping link destinations. */
export function announcementLines(
  psas: readonly PSA[],
  width: number,
  now = Date.now(),
): { text: string; level?: number }[] {
  return psas.flatMap((psa) => {
    const date = psa.date === undefined ? undefined : new Date(psa.date);
    const message = psa.message
      .replaceAll("{dateNoTime}", date?.toLocaleDateString() ?? "")
      .replaceAll("{date}", date?.toLocaleString() ?? "")
      .replaceAll(
        "{dateDifference}",
        psa.date === undefined
          ? ""
          : `${Math.ceil(Math.abs(psa.date - now) / 60_000)} minutes ${psa.date >= now ? "from now" : "ago"}`,
      )
      .replace(
        /<a\b[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi,
        "$2 ($1)",
      )
      .replace(/<(?:br\s*\/|br|\/p|\/div)>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(
        /&(amp|lt|gt|quot|apos|nbsp);/g,
        (_, entity: string) =>
          ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[
            entity
          ] ?? "",
      )
      .split("")
      .filter(
        (char) =>
          char === "\n" ||
          char === "\t" ||
          (char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127),
      )
      .join("");
    const lines: string[] = [
      psa.sticky === true ? "[important]" : "[announcement]",
    ];
    for (const paragraph of message.split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        if (line !== "" && Array.from(`${line} ${word}`).length > width) {
          lines.push(line);
          line = "";
        }
        const chars = Array.from(word);
        while (chars.length > width) {
          lines.push(chars.splice(0, Math.max(1, width)).join(""));
        }
        line += `${line === "" ? "" : " "}${chars.join("")}`;
      }
      lines.push(line);
    }
    return [...lines, ""].map((text) => ({ text, level: psa.level }));
  });
}
