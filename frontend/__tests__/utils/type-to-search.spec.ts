import { describe, expect, it } from "vite-plus/test";

import { isEditableElement } from "../../src/ts/utils/type-to-search";

describe("isEditableElement", () => {
  it("accepts form fields", () => {
    expect(isEditableElement(document.createElement("input"))).toBe(true);
    expect(isEditableElement(document.createElement("textarea"))).toBe(true);
    expect(isEditableElement(document.createElement("select"))).toBe(true);
  });

  it("accepts contenteditable elements", () => {
    const div = document.createElement("div");
    div.contentEditable = "true";
    // jsdom doesn't derive isContentEditable from the attribute
    Object.defineProperty(div, "isContentEditable", { value: true });
    expect(isEditableElement(div)).toBe(true);
  });

  it("rejects other elements", () => {
    expect(isEditableElement(null)).toBe(false);
    expect(isEditableElement(document.body)).toBe(false);
    expect(isEditableElement(document.createElement("button"))).toBe(false);
  });
});
