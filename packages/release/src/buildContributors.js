import dotenv from "dotenv";
import { getRepository } from "./repository.js";

dotenv.config();

const { owner: OWNER, repo: REPO } = getRepository();

async function getContributors(page) {
  console.log(`Getting contributors from page ${page}`);
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contributors?anon=1&per_page=100&page=${page}`,
    {
      method: "GET",
      headers: {
        "User-Agent": "oxytype release script",
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        }),
      },
    },
  );
  return res.json();
}

async function main() {
  let total = [];
  let page = 1;
  let lastCount = 1;

  while (lastCount > 0) {
    const data = await getContributors(page);
    const contributors = data.map((c) => ({
      name: c.login ?? c.name,
      contributions: c.contributions,
    }));
    lastCount = contributors.length;
    page++;
    total.push(...contributors);
  }

  total = total
    .filter(
      (c) => !c.name?.includes("[bot]"),
    )
    .sort((a, b) => b.contributions - a.contributions);

  // dedupe
  const seen = new Set();
  total = total.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });

  console.log(JSON.stringify(total.map((c) => c.name)));
}

main();
