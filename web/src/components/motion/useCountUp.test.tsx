// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCountUp } from "./useCountUp";

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

describe("useCountUp", () => {
  it("shows the real value immediately on first render", () => {
    const { result } = renderHook(() => useCountUp(42));
    expect(result.current).toBe(42);
  });

  it("jumps straight to new values when the user prefers reduced motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    const { result, rerender } = renderHook(({ v }) => useCountUp(v), { initialProps: { v: 10 } });
    rerender({ v: 99 });
    expect(result.current).toBe(99);
  });

  it("settles on the new value after animating", async () => {
    const { result, rerender } = renderHook(({ v }) => useCountUp(v, 50), { initialProps: { v: 0 } });
    rerender({ v: 100 });
    await waitFor(() => expect(result.current).toBe(100));
  });
});
