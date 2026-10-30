import { describe, expect, it } from "vitest";
import { mulberry32, seedFrom, splitInt } from "./rng";

describe("seeded random numbers", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("stays within [0, 1)", () => {
    const r = mulberry32(seedFrom("freshcart"));
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("gives different text different seeds", () => expect(seedFrom("a")).not.toBe(seedFrom("b")));
});

describe("splitInt", () => {
  it("splits a total proportionally and always adds up", () => {
    const parts = splitInt(10, [0.7, 0.2, 0.1]);
    expect(parts).toEqual([7, 2, 1]);
    expect(splitInt(7, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(7);
  });
  it("returns zeros for a zero total", () => expect(splitInt(0, [0.5, 0.5])).toEqual([0, 0]));
  it("refuses a positive total with no positive weight", () => expect(() => splitInt(5, [0, 0])).toThrow());
});
