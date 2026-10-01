import { AppRouter, isAppRoute } from "@ts-rest/core";
import { getPath } from "hono/utils/url";

/** Preserve case-insensitive static route matching without changing parameter values. */
export function createPathNormalizer(
  contract: AppRouter,
  extraPaths: string[],
): (request: Request) => string {
  const paths: string[][] = extraPaths.map((path) => path.split("/"));
  collect(contract);
  const byLength = new Map<number, string[][]>();
  for (const segments of paths) {
    const entries = byLength.get(segments.length) ?? [];
    entries.push(segments);
    byLength.set(segments.length, entries);
  }
  return (request) => {
    const original = getPath(request);
    const path = original.length > 1 ? original.replace(/\/$/, "") : original;
    const segments = path.split("/");
    const canonical = byLength
      .get(segments.length)
      ?.find((candidate) =>
        candidate.every((segment, i) =>
          segment.startsWith(":")
            ? segments[i] !== ""
            : segment.toLowerCase() === segments[i]?.toLowerCase(),
        ),
      );
    if (canonical !== undefined) {
      return canonical
        .map((segment, i) => (segment.startsWith(":") ? segments[i] : segment))
        .join("/");
    }
    // Static asset filenames retain their filesystem case.
    return path.replace(/^\/configure(?=\/|$)/i, "/configure");
  };
  function collect(router: AppRouter): void {
    for (const route of Object.values(router)) {
      if (isAppRoute(route)) {
        paths.push((route.path.replace(/\/$/, "") || "/").split("/"));
      } else {
        collect(route);
      }
    }
  }
}
