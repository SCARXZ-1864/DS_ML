"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Shows `target` immediately on the first render (so server HTML has real numbers),
 * then eases from the previous value whenever `target` changes.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const reduce = usePrefersReducedMotion();
  const [animated, setAnimated] = useState<number | null>(null);
  const previous = useRef(target);

  useEffect(() => {
    const from = previous.current;
    previous.current = target;
    if (reduce || from === target || typeof requestAnimationFrame === "undefined") return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const k = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - k, 3);
      setAnimated(k < 1 ? from + (target - from) * eased : null);
      if (k < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduce]);

  return animated === null || reduce ? target : animated;
}
