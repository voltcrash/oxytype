const visibilityChecks = new Set<() => boolean>();

// Components retain ownership of their nodes, including the closing animation.
export function registerOverlayVisibility(check: () => boolean): () => void {
  visibilityChecks.add(check);
  return () => visibilityChecks.delete(check);
}

export function isAnyPopupVisible(): boolean {
  return [...visibilityChecks].some((check) => check());
}
