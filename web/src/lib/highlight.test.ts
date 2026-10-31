import { describe, expect, it } from "vitest";
import { segmentText } from "./highlight";

const m = (start: number, end: number, sentiment: "positive" | "negative" = "negative", aspectId = "a") => ({ aspectId, start, end, sentiment });

describe("segmentText", () => {
  it("returns plain text when there are no mentions", () => {
    expect(segmentText("hello", [])).toEqual([{ text: "hello" }]);
  });

  it("splits around mentions given in any order", () => {
    const parts = segmentText("food good, wait bad", [m(11, 15, "negative", "w"), m(0, 4, "positive", "f")]);
    expect(parts.map((p) => p.text)).toEqual(["food", " good, ", "wait", " bad"]);
    expect(parts[0].mention).toEqual({ aspectId: "f", sentiment: "positive" });
    expect(parts[2].mention).toEqual({ aspectId: "w", sentiment: "negative" });
  });

  it("keeps the first of two overlapping mentions and never loses text", () => {
    const parts = segmentText("abcdefgh", [m(2, 6), m(4, 8)]);
    expect(parts.map((p) => p.text).join("")).toBe("abcdefgh");
    expect(parts.filter((p) => p.mention)).toHaveLength(1);
  });

  it("ignores mentions outside the text", () => {
    expect(segmentText("abc", [m(2, 10)])).toEqual([{ text: "abc" }]);
  });
});
