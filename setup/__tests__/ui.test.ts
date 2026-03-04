import { describe, expect, test } from "bun:test";
import { summarySection } from "../ui.ts";

describe("summarySection", () => {
  test("formats header and items with color function", () => {
    const identity = (s: string) => s;
    const result = summarySection("Header", ["a", "b"], identity);
    expect(result).toBe("Header:\n  ✓ a\n  ✓ b");
  });

  test("uses custom symbol", () => {
    const identity = (s: string) => s;
    const result = summarySection("H", ["x"], identity, "→");
    expect(result).toBe("H:\n  → x");
  });

  test("appends suffix", () => {
    const identity = (s: string) => s;
    const result = summarySection("H", ["x"], identity, "✓", "extra");
    expect(result).toBe("H:\n  ✓ x\n  extra");
  });

  test("applies color function to each part", () => {
    const upper = (s: string) => s.toUpperCase();
    const result = summarySection("head", ["item"], upper);
    expect(result).toBe("HEAD:\n  ✓ ITEM");
  });
});
