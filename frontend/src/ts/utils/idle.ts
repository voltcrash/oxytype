/**
 * Runs `fn` once the browser is idle, falling back to a timeout where
 * `requestIdleCallback` is unavailable (Safari).
 */
export function runWhenIdle(fn: () => void, timeout = 2000): () => void {
  if (typeof requestIdleCallback === "function") {
    const handle = requestIdleCallback(fn, { timeout });
    return () => cancelIdleCallback(handle);
  }
  const handle = setTimeout(fn, Math.min(timeout, 200));
  return () => clearTimeout(handle);
}
