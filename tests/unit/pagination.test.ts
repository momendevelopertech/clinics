import { describe, expect, it } from "vitest";
import { paginate, clampPage, itemCountLabel } from "@/lib/pagination";

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, index) => index + 1);

  it("returns the first page slice", () => {
    expect(paginate(items, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("returns later page slices", () => {
    expect(paginate(items, 2, 10)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(paginate(items, 3, 10)).toEqual([21, 22, 23, 24, 25]);
  });

  it("returns an empty array past the end", () => {
    expect(paginate(items, 99, 10)).toEqual([]);
  });

  it("clamps invalid pages to the first page", () => {
    expect(paginate(items, 0, 10)).toEqual(paginate(items, 1, 10));
    expect(paginate(items, NaN, 10)).toEqual(paginate(items, 1, 10));
  });

  it("clamps invalid page sizes to one", () => {
    expect(paginate(items, 1, 0)).toEqual(paginate(items, 1, 1));
  });

  it("handles empty collections", () => {
    expect(paginate([], 1, 10)).toEqual([]);
  });
});

describe("clampPage", () => {
  it("keeps in-range pages", () => {
    expect(clampPage(2, 25, 10)).toBe(2);
  });

  it("clamps above the last page", () => {
    expect(clampPage(9, 25, 10)).toBe(3);
  });

  it("clamps below the first page", () => {
    expect(clampPage(0, 25, 10)).toBe(1);
    expect(clampPage(-3, 25, 10)).toBe(1);
  });

  it("never returns below page one for empty collections", () => {
    expect(clampPage(1, 0, 10)).toBe(1);
  });
});

describe("itemCountLabel", () => {
  it("uses singular form for exactly one item", () => {
    expect(itemCountLabel(1, "item", "items")).toBe("1 item");
  });

  it("uses plural form for zero items", () => {
    expect(itemCountLabel(0, "item", "items")).toBe("0 items");
  });

  it("uses plural form for multiple items", () => {
    expect(itemCountLabel(5, "item", "items")).toBe("5 items");
    expect(itemCountLabel(100, "item", "items")).toBe("100 items");
  });

  it("handles Arabic forms correctly", () => {
    expect(itemCountLabel(1, "عنصر", "عناصر")).toBe("1 عنصر");
    expect(itemCountLabel(2, "عنصر", "عناصر")).toBe("2 عناصر");
  });

  it("clamps negative counts to zero", () => {
    expect(itemCountLabel(-3, "item", "items")).toBe("0 items");
  });

  it("clamps fractional counts to integer", () => {
    expect(itemCountLabel(2.7, "item", "items")).toBe("2 items");
  });

  it("handles NaN input as zero", () => {
    expect(itemCountLabel(NaN, "item", "items")).toBe("0 items");
  });
});