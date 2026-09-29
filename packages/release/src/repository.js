const DEFAULT_OWNER = "voltcrash";
const DEFAULT_REPO = "oxytype";

export function getRepository() {
  const owner = process.env.OXYTYPE_GITHUB_OWNER?.trim() || DEFAULT_OWNER;
  const repo = process.env.OXYTYPE_GITHUB_REPO?.trim() || DEFAULT_REPO;

  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) {
    throw new Error("Invalid Oxytype GitHub repository configuration");
  }
  if (owner === "monkeytypegame") {
    throw new Error("Oxytype releases cannot target the upstream owner");
  }

  return { owner, repo };
}

export function getRepositoryUrl() {
  const { owner, repo } = getRepository();
  return `https://github.com/${owner}/${repo}`;
}
