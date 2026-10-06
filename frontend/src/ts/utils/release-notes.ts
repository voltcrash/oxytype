// Private use character, never present in release notes.
const placeholder = String.fromCodePoint(0xe000);

// Keeps `/` and backticks intact so links and code can still be parsed.
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders the inline markdown used in GitHub release notes: backslash
 * escapes, links, bold and code. Everything else is escaped.
 */
function renderInline(text: string): string {
  const escapes: string[] = [];
  let html = text.replace(/\\([\\`*_[\]<>()#-])/g, (_, char: string) => {
    escapes.push(char);
    return `${placeholder}${escapes.length - 1}${placeholder}`;
  });

  html = escapeHTML(html);
  html = html.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (match, label: string, url: string) =>
      /^https?:\/\//.test(url)
        ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : match,
  );
  html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  return html.replace(
    new RegExp(`${placeholder}(\\d+)${placeholder}`, "g"),
    (_, index: string) => escapeHTML(escapes[Number(index)] ?? ""),
  );
}

/**
 * Converts GitHub release note markdown into HTML for the version history.
 */
export function releaseNotesToHtml(markdown: string): string {
  const lines = markdown
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n");

  const blocks: string[] = [];
  let list: string[] = [];
  let paragraph: string[] = [];

  const flush = (): void => {
    if (list.length > 0) {
      blocks.push(`<ul>${list.join("")}</ul>`);
      list = [];
    }
    if (paragraph.length > 0) {
      blocks.push(`<p>${paragraph.join(" ")}</p>`);
      paragraph = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = /^#{1,6}\s+(.*)$/.exec(trimmed);
    const item = /^[-*]\s+(.*)$/.exec(trimmed);

    if (trimmed === "") {
      flush();
    } else if (heading !== null) {
      flush();
      blocks.push(`<h3>${renderInline(heading[1] ?? "")}</h3>`);
    } else if (item !== null) {
      if (paragraph.length > 0) flush();
      list.push(`<li>${renderInline(item[1] ?? "")}</li>`);
    } else {
      if (list.length > 0) flush();
      paragraph.push(renderInline(trimmed));
    }
  }
  flush();

  return blocks.join("");
}

export type VersionHistoryRelease = {
  tag: string;
  name: string;
  publishedAt: string;
  bodyHTML: string;
};
