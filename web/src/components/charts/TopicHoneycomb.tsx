"use client";

import { useMemo } from "react";
import type { Topic } from "@/lib/data/schemas";
import { fmtInt } from "@/lib/format";
import { hexPoints, layoutHoneycomb } from "./hex-layout";

const W = 560;
const H = 360;
// Cells are drawn slightly smaller than their slot, so the background shows as the honeycomb's walls.
const GAP = 0.93;

type Props = { topics: Topic[]; visibleIds: Set<string>; selectedId: string | null; onSelect: (id: string) => void };

const shortLabel = (label: string, maxChars: number) => {
  const name = label.split(":")[0];
  return name.length <= maxChars ? name : `${name.slice(0, Math.max(1, maxChars - 1))}…`;
};

/** One hexagon per topic, biggest in the centre; colour runs from positive (green) to negative (red). */
export function TopicHoneycomb({ topics, visibleIds, selectedId, onSelect }: Props) {
  // Lay out every topic once, so cells keep their place while filters dim them.
  const cells = useMemo(() => layoutHoneycomb(topics.map((t) => ({ id: t.id, size: t.size })), W, H), [topics]);
  const byId = new Map(topics.map((t) => [t.id, t]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label="Topic map">
      {cells.map((c, i) => {
        const t = byId.get(c.id)!;
        const visible = visibleIds.has(t.id);
        const selected = t.id === selectedId;
        const label = `${t.label}: ${fmtInt(t.size)} reviews, ${Math.round(t.negShare * 100)}% of opinions negative`;
        const fontSize = Math.min(14, Math.max(10, c.s * 0.2));
        // A hexagon's flat-to-flat width is √3·s; the label gets most of that at ~0.55 em per character.
        const maxChars = Math.floor((c.s * 1.6) / (fontSize * 0.55));
        return (
          <g
            key={t.id}
            transform={`translate(${c.x} ${c.y})`}
            role={visible ? "button" : undefined}
            aria-label={visible ? label : undefined}
            aria-hidden={visible ? undefined : true}
            aria-pressed={visible ? selected : undefined}
            tabIndex={visible ? 0 : -1}
            onClick={() => visible && onSelect(t.id)}
            onKeyDown={(e) => {
              if (visible && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelect(t.id);
              }
            }}
            className={`group cursor-pointer outline-none transition-opacity ${visible ? "opacity-100" : "pointer-events-none opacity-20"}`}
          >
            <title>{label}</title>
            <polygon
              points={hexPoints(c.s * GAP)}
              strokeLinejoin="round"
              // outline-none on the group needs a visible replacement: an accent ring on keyboard focus.
              className={`animate-pop stroke-bg transition-[filter] group-hover:brightness-110 group-focus-visible:stroke-accent group-focus-visible:[stroke-width:4] ${selected ? "stroke-ink" : ""}`}
              strokeWidth={selected ? 3 : 2}
              style={{ fill: `color-mix(in srgb, var(--color-neg) ${Math.round(t.negShare * 100)}%, var(--color-pos))`, animationDelay: `${i * 40}ms` }}
            />
            {c.s > 30 && (
              <text textAnchor="middle" fontSize={fontSize} className="pointer-events-none fill-bg">
                <tspan x={0} dy="-0.15em" className="font-semibold">{shortLabel(t.label, maxChars)}</tspan>
                <tspan x={0} dy="1.3em" className="font-mono" fontSize={fontSize * 0.85}>{fmtInt(t.size)}</tspan>
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
