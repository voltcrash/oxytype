/** Builds the public snapshot, newest first, without GitHub API metadata. */
export function buildReleaseHistory(releases) {
  return releases
    .filter((release) => !release.draft && !release.prerelease)
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))
    .slice(0, 10)
    .map((release) => ({
      tag_name: release.tag_name,
      name: release.name?.trim() ? release.name : release.tag_name,
      published_at: release.published_at,
      body: release.body ?? "",
    }));
}
