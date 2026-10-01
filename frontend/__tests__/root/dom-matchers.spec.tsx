import { expect, it } from "vite-plus/test";

// Explicit return types catch regressions in our Vitest matcher augmentation.
const assertVisible = (element: HTMLElement): void =>
  expect(element).toBeVisible();
const assertResolvedVisible = async (element: HTMLElement): Promise<void> =>
  expect(Promise.resolve(element)).resolves.toBeVisible();

it("preserves synchronous and asynchronous DOM matcher return types", async () => {
  const element = document.createElement("div");
  document.body.append(element);

  try {
    assertVisible(element);
    await assertResolvedVisible(element);
  } finally {
    element.remove();
  }
});
