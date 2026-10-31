import { forceCollide, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";

export type Bubble = { id: string; r: number; x: number; y: number };
type Node = SimulationNodeDatum & { id: string; r: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Packs circles (area ∝ size) around the centre with a short physics simulation.
 * d3-force seeds its starting spiral deterministically, so the same input gives the same layout.
 */
export function layoutBubbles(items: { id: string; size: number }[], width: number, height: number): Bubble[] {
  if (items.length === 0) return [];
  const largest = Math.max(1, ...items.map((i) => i.size));
  const maxR = Math.min(width, height) / 5;
  const nodes: Node[] = items.map((i) => ({ id: i.id, r: Math.max(10, Math.sqrt(i.size / largest) * maxR) }));
  const simulation = forceSimulation(nodes)
    .force("x", forceX(width / 2).strength(0.06))
    .force("y", forceY(height / 2).strength(0.09))
    .force("collide", forceCollide<Node>((n) => n.r + 3).iterations(3))
    .stop();
  for (let i = 0; i < 300; i++) simulation.tick();
  return nodes.map((n) => ({
    id: n.id,
    r: n.r,
    x: clamp(n.x ?? width / 2, n.r, width - n.r),
    y: clamp(n.y ?? height / 2, n.r, height - n.r),
  }));
}
