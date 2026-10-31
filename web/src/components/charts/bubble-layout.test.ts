import { describe, expect, it } from "vitest";
import { layoutBubbles } from "./bubble-layout";

const items = [
  { id: "a", size: 900 }, { id: "b", size: 400 }, { id: "c", size: 250 },
  { id: "d", size: 120 }, { id: "e", size: 60 }, { id: "f", size: 30 },
];

describe("layoutBubbles", () => {
  it("places one bubble per topic inside the box", () => {
    const bubbles = layoutBubbles(items, 560, 360);
    expect(bubbles).toHaveLength(6);
    for (const b of bubbles) {
      expect(b.x - b.r).toBeGreaterThanOrEqual(0);
      expect(b.x + b.r).toBeLessThanOrEqual(560);
      expect(b.y - b.r).toBeGreaterThanOrEqual(0);
      expect(b.y + b.r).toBeLessThanOrEqual(360);
    }
  });

  it("does not overlap bubbles", () => {
    const bubbles = layoutBubbles(items, 560, 360);
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const [p, q] = [bubbles[i], bubbles[j]];
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(p.r + q.r - 1);
      }
    }
  });

  it("gives bigger topics bigger bubbles and is repeatable", () => {
    const bubbles = layoutBubbles(items, 560, 360);
    expect(bubbles[0].r).toBeGreaterThan(bubbles[5].r);
    expect(layoutBubbles(items, 560, 360)).toEqual(bubbles);
  });

  it("handles no topics", () => expect(layoutBubbles([], 560, 360)).toEqual([]));
});
