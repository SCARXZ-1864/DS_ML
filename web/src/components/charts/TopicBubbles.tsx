"use client";

import { useMemo } from "react";
import type { Topic } from "@/lib/data/schemas";
import { fmtInt } from "@/lib/format";
import { layoutBubbles } from "./bubble-layout";

const W = 560;
const H = 360;

type Props = { topics: Topic[]; visibleIds: Set<string>; selectedId: string | null; onSelect: (id: string) => void };

/** Bubble size = number of reviews; colour runs from positive (green) to negative (red). */
export function TopicBubbles({ topics, visibleIds, selectedId, onSelect }: Props) {
  // Lay out every topic once, so bubbles keep their place while filters dim them.
  const bubbles = useMemo(() => layoutBubbles(topics.map((t) => ({ id: t.id, size: t.size })), W, H), [topics]);
  const byId = new Map(topics.map((t) => [t.id, t]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label="Topic map">
      {bubbles.map((b, i) => {
        const t = byId.get(b.id)!;
        const visible = visibleIds.has(t.id);
        const selected = t.id === selectedId;
        const label = `${t.label}: ${fmtInt(t.size)} reviews, ${Math.round(t.negShare * 100)}% negative`;
        return (
          <g
            key={t.id}
            transform={`translate(${b.x} ${b.y})`}
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
            className={`cursor-pointer outline-none transition-opacity ${visible ? "opacity-100" : "pointer-events-none opacity-20"}`}
          >
            <circle
              r={b.r}
              className={`animate-pop stroke-bg ${selected ? "stroke-ink" : ""}`}
              strokeWidth={selected ? 3 : 2}
              style={{ fill: `color-mix(in srgb, var(--color-neg) ${Math.round(t.negShare * 100)}%, var(--color-pos))`, animationDelay: `${i * 40}ms` }}
            />
            {b.r > 34 && (
              <text textAnchor="middle" dy="0.35em" fontSize={11} className="pointer-events-none fill-bg font-semibold">
                {t.label.split(":")[0]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
