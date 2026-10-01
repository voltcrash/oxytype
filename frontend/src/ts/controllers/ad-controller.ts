// Oxytype has no configured advertising provider.
export const adBlock = false;
export const cookieBlocker = false;

export async function checkAdblock(): Promise<void> {
  return;
}

export async function checkCookieblocker(): Promise<void> {
  return;
}

export async function reinstate(): Promise<boolean> {
  return false;
}

export async function renderResult(): Promise<void> {
  return;
}

export function updateFooterAndVerticalAds(_visible: boolean): void {
  return;
}

export function showConsentPopup(): void {
  return;
}

export function destroyResult(): void {
  return;
}

export function useAdLifecycle(): void {
  return;
}
