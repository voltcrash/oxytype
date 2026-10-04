const sections = [
  { title: "Features", types: ["feat"] },
  { title: "Improvements", types: ["impr", "perf"] },
  { title: "Fixes", types: ["fix"] },
];

const conventionalSubject = /^(\w+)(?:\(([^)]+)\))?!?:\s+(.+)$/;

export function escapeMarkdown(value) {
  return value.replace(/[\\`*_[\]<>]/g, "\\$&");
}

function parseCommit({ hash, subject }) {
  const match = conventionalSubject.exec(subject);
  if (match === null) {
    return { hash, type: undefined, scope: undefined, message: subject };
  }
  const [, type, scope, message] = match;
  return { hash, type: type.toLowerCase(), scope, message };
}

function formatCommit(commit, repoUrl, includeType) {
  const label = includeType
    ? `${commit.type}${commit.scope ? `(${commit.scope})` : ""}`
    : commit.scope;
  const prefix = label ? `**${escapeMarkdown(label)}:** ` : "";
  return `- ${prefix}${escapeMarkdown(commit.message)} ([${commit.hash.slice(0, 7)}](${repoUrl}/commit/${commit.hash}))`;
}

/**
 * Groups commits into Monkeytype-style release note sections.
 * @param {{ hash: string, subject: string }[]} commits oldest first
 * @param {string} repoUrl
 * @returns {string} Markdown, or an empty string when nothing is listed.
 */
export function buildDailyChangelog(commits, repoUrl) {
  const parsed = commits.map(parseCommit);

  const blocks = [];
  for (const section of sections) {
    const items = parsed.filter((commit) =>
      section.types.includes(commit.type),
    );
    if (items.length === 0) continue;
    blocks.push(
      `### ${section.title}\n\n${items.map((commit) => formatCommit(commit, repoUrl, false)).join("\n")}`,
    );
  }

  const listedTypes = new Set(sections.flatMap((section) => section.types));
  const other = parsed.filter((commit) => !listedTypes.has(commit.type));
  if (other.length > 0) {
    blocks.push(
      `### Nerd stuff\n\nThese changes will not be visible to users, but are included for completeness.\n\n${other.map((commit) => formatCommit(commit, repoUrl, commit.type !== undefined)).join("\n")}`,
    );
  }

  return blocks.join("\n\n");
}
