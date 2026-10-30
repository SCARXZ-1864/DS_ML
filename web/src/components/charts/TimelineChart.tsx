"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fullRange, type MonthRange } from "@/lib/data/derive";
import type { MonthPoint } from "@/lib/data/schemas";
import { fmtInt, fmtMonth, fmtPct } from "@/lib/format";
import { TL_HEIGHT, TL_WIDTH, indexFromX, rangeFromIndices, timelinePaths, timelineSummary } from "./timeline-geometry";

type Props = { monthly: MonthPoint[]; range: MonthRange; onRangeChange: (range: MonthRange) => void };

export function TimelineChart({ monthly, range, onRangeChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const paths = useMemo(() => timelinePaths(monthly), [monthly]);
  const summary = useMemo(() => timelineSummary(monthly), [monthly]);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);

  const n = monthly.length;
  const indexAt = (clientX: number) => {
    const box = svgRef.current?.getBoundingClientRect();
    return box ? indexFromX(clientX - box.left, box.width, n) : 0;
  };

  // Finish a drag even if the mouse is released outside the chart.
  useEffect(() => {
    if (!drag) return;
    const finish = () => {
      setDrag(null);
      if (drag.start !== drag.end) onRangeChange(rangeFromIndices(monthly, drag.start, drag.end));
    };
    window.addEventListener("mouseup", finish);
    return () => window.removeEventListener("mouseup", finish);
  }, [drag, monthly, onRangeChange]);

  const indexOf = (month: string, fallback: number) => {
    const i = monthly.findIndex((m) => m.month === month);
    return i < 0 ? fallback : i;
  };
  const lo = drag ? Math.min(drag.start, drag.end) : indexOf(range.from, 0);
  const hi = drag ? Math.max(drag.start, drag.end) : indexOf(range.to, n - 1);
  const hovered = hover === null ? null : monthly[hover];
  const sharePct = (p: MonthPoint, key: "pos" | "neg") => (p.count ? (p[key] / p.count) * 100 : null);

  return (
    <figure className="relative m-0 select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${TL_WIDTH} ${TL_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
        className="block h-48 w-full cursor-crosshair"
        onMouseDown={(e) => {
          const i = indexAt(e.clientX);
          setDrag({ start: i, end: i });
        }}
        onMouseMove={(e) => {
          const i = indexAt(e.clientX);
          setHover(i);
          if (drag) setDrag({ start: drag.start, end: i });
        }}
        onMouseLeave={() => setHover(null)}
        onDoubleClick={() => onRangeChange(fullRange(monthly))}
      >
        <path d={paths.posArea} className="fill-pos/25" />
        <path d={paths.negArea} className="fill-neg/25" />
        <path d={paths.posLine} pathLength={1} className="animate-draw fill-none stroke-pos" strokeWidth={2} />
        <path d={paths.negLine} pathLength={1} className="animate-draw fill-none stroke-neg" strokeWidth={2} />
        <rect x={0} y={0} width={paths.xAt(lo)} height={TL_HEIGHT} className="fill-bg/70" />
        <rect x={paths.xAt(hi)} y={0} width={TL_WIDTH - paths.xAt(hi)} height={TL_HEIGHT} className="fill-bg/70" />
        {hover !== null && (
          <line x1={paths.xAt(hover)} x2={paths.xAt(hover)} y1={0} y2={TL_HEIGHT} className="stroke-muted" strokeDasharray="3 3" />
        )}
      </svg>

      {hovered && hover !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-2 z-10 border border-line bg-panel-2 px-2.5 py-1.5 text-xs"
          style={{ left: `min(calc(${(hover / Math.max(1, n - 1)) * 100}% + 12px), calc(100% - 10rem))` }}
        >
          <span className="label block">{fmtMonth(hovered.month)}</span>
          <span className="block font-mono">{fmtInt(hovered.count)} reviews</span>
          <span className="block font-mono text-pos">positive {fmtPct(sharePct(hovered, "pos"))}</span>
          <span className="block font-mono text-neg">negative {fmtPct(sharePct(hovered, "neg"))}</span>
        </div>
      )}

      <figcaption className="mt-1 flex justify-between font-mono text-[10.5px] text-muted">
        <span>{fmtMonth(monthly[0].month)}</span>
        <span>{fmtMonth(monthly[Math.floor((n - 1) / 2)].month)}</span>
        <span>{fmtMonth(monthly[n - 1].month)}</span>
      </figcaption>
    </figure>
  );
}
