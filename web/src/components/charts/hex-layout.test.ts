import { describe, expect, it } from "vitest";
import { hexPoints, layoutHoneycomb } from "./hex-layout";

const items = [
  { id: "f", size: 30 }, { id: "a", size: 900 }, { id: "b", size: 400 },
  { id: "c", size: 250 }, { id: "d", size: 120 }, { id: "e", size: 60 },
];

describe("layoutHoneycomb", () => {
  it("places one equal-sized cell per topic inside the box", () => {
    const cells = layoutHoneycomb(items, 560, 360);
    expect(cells).toHaveLength(6);
    const s = cells[0].s;
    for (const c of cells) {
      expect(c.s).toBe(s);
      // A pointy-top hexagon is √3·s wide and 2·s tall.
      expect(c.x - (Math.sqrt(3) / 2) * s).toBeGreaterThanOrEqual(-0.01);
      expect(c.x + (Math.sqrt(3) / 2) * s).toBeLessThanOrEqual(560.01);
      expect(c.y - s).toBeGreaterThanOrEqual(-0.01);
      expect(c.y + s).toBeLessThanOrEqual(360.01);
    }
  });

  it("tiles cells edge to edge without overlap", () => {
    const cells = layoutHoneycomb(items, 560, 360);
    const neighbour = Math.sqrt(3) * cells[0].s; // centre-to-centre distance of touching hexagons
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        expect(Math.hypot(cells[i].x - cells[j].x, cells[i].y - cells[j].y)).toBeGreaterThanOrEqual(neighbour - 0.01);
      }
    }
  });

  it("puts the biggest topic in the centre and is repeatable", () => {
    const cells = layoutHoneycomb(items, 560, 360);
    const centre = cells.find((c) => c.id === "a")!;
    const others = cells.filter((c) => c.id !== "a");
    const neighbour = Math.sqrt(3) * centre.s;
    // Every other topic sits in the first ring, touching the biggest one.
    for (const c of others) expect(Math.hypot(c.x - centre.x, c.y - centre.y)).toBeCloseTo(neighbour, 5);
    expect(layoutHoneycomb(items, 560, 360)).toEqual(cells);
  });

  it("grows into a second ring for more topics", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, size: 100 - i }));
    const cells = layoutHoneycomb(many, 560, 360);
    expect(cells).toHaveLength(12);
    expect(new Set(cells.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`)).size).toBe(12);
  });

  it("handles no topics", () => expect(layoutHoneycomb([], 560, 360)).toEqual([]));
});

describe("hexPoints", () => {
  it("returns six corners at the given radius", () => {
    const pts = hexPoints(10).split(" ").map((p) => p.split(",").map(Number));
    expect(pts).toHaveLength(6);
    for (const [x, y] of pts) expect(Math.hypot(x, y)).toBeCloseTo(10, 1);
  });
});
