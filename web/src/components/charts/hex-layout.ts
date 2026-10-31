export type HexCell = { id: string; x: number; y: number; s: number };

const SQRT3 = Math.sqrt(3);
// Axial steps to the six neighbours of a hexagon, in walking order around a ring.
const DIRS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

/** Axial coordinates of a honeycomb in spiral order: the centre, then ring 1, ring 2, … */
function spiral(count: number): [number, number][] {
  const out: [number, number][] = [[0, 0]];
  for (let ring = 1; out.length < count; ring++) {
    let [q, r] = [DIRS[4][0] * ring, DIRS[4][1] * ring];
    for (let side = 0; side < 6; side++) {
      for (let step = 0; step < ring; step++) {
        out.push([q, r]);
        [q, r] = [q + DIRS[side][0], r + DIRS[side][1]];
      }
    }
  }
  return out.slice(0, count);
}

/**
 * Tiles equal pointy-top hexagons in a honeycomb: the biggest topic in the centre, the rest
 * spiralling outward by size. Cells are scaled and centred to fit the box.
 */
export function layoutHoneycomb(items: { id: string; size: number }[], width: number, height: number): HexCell[] {
  if (items.length === 0) return [];
  // Stable sort keeps equal-sized topics in their given order, so the layout is repeatable.
  const ordered = [...items].sort((a, b) => b.size - a.size);
  const unit = spiral(ordered.length).map(([q, r]) => ({ x: SQRT3 * (q + r / 2), y: 1.5 * r }));

  const minX = Math.min(...unit.map((p) => p.x)) - SQRT3 / 2;
  const maxX = Math.max(...unit.map((p) => p.x)) + SQRT3 / 2;
  const minY = Math.min(...unit.map((p) => p.y)) - 1;
  const maxY = Math.max(...unit.map((p) => p.y)) + 1;
  // Cap the size so a shop with one or two topics doesn't get giant cells.
  const s = Math.min(width / (maxX - minX), height / (maxY - minY), Math.min(width, height) / 4);
  const dx = (width - (maxX - minX) * s) / 2 - minX * s;
  const dy = (height - (maxY - minY) * s) / 2 - minY * s;

  return ordered.map((item, i) => ({ id: item.id, x: unit[i].x * s + dx, y: unit[i].y * s + dy, s }));
}

/** SVG `points` for a pointy-top hexagon of radius r centred on the origin. */
export function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}
