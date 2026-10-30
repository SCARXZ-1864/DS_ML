// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MonthPoint } from "@/lib/data/schemas";
import { TimelineChart } from "./TimelineChart";

const monthly: MonthPoint[] = Array.from({ length: 36 }, (_, i) => {
  const d = new Date(Date.UTC(2023, 10 + i, 1));
  const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return { month, count: 100, pos: 70, neg: 20, neu: 10, stars: null };
});

function setup() {
  const onRangeChange = vi.fn();
  render(<TimelineChart monthly={monthly} range={{ from: monthly[0].month, to: monthly[35].month }} onRangeChange={onRangeChange} />);
  const svg = screen.getByRole("img");
  // jsdom has no layout engine, so give the chart a real size.
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 200, width: 800, height: 200, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return { svg, onRangeChange };
}

describe("TimelineChart", () => {
  it("describes the trend for screen readers", () => {
    const { svg } = setup();
    expect(svg.getAttribute("aria-label")).toContain("Positive share went from 70%");
  });

  it("selects the months you drag across", () => {
    const { svg, onRangeChange } = setup();
    fireEvent.mouseDown(svg, { clientX: 100 });
    fireEvent.mouseMove(svg, { clientX: 400 });
    fireEvent.mouseUp(window);
    expect(onRangeChange).toHaveBeenCalledWith({ from: monthly[4].month, to: monthly[18].month });
  });

  it("orders a right-to-left drag", () => {
    const { svg, onRangeChange } = setup();
    fireEvent.mouseDown(svg, { clientX: 400 });
    fireEvent.mouseMove(svg, { clientX: 100 });
    fireEvent.mouseUp(window);
    expect(onRangeChange).toHaveBeenCalledWith({ from: monthly[4].month, to: monthly[18].month });
  });

  it("ignores a click without a drag", () => {
    const { svg, onRangeChange } = setup();
    fireEvent.mouseDown(svg, { clientX: 300 });
    fireEvent.mouseUp(window);
    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it("resets to all time on double-click", () => {
    const { svg, onRangeChange } = setup();
    fireEvent.doubleClick(svg);
    expect(onRangeChange).toHaveBeenCalledWith({ from: monthly[0].month, to: monthly[35].month });
  });
});
