import { describe, it, expect } from "vite-plus/test";
import {
  convertNumberToArabic,
  convertNumberToBangla,
  convertNumberToHindi,
  convertNumberToNepali,
} from "../src/numerals";

describe("numerals", () => {
  it("converts western digits", () => {
    expect(convertNumberToArabic("1029")).toBe("١٠٢٩");
    expect(convertNumberToBangla("1029")).toBe("১০২৯");
    expect(convertNumberToNepali("1029")).toBe("१०२९");
    expect(convertNumberToHindi("1029")).toBe("१०२९");
  });
});
