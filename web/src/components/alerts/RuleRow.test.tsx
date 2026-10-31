// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AlertRule } from "@/lib/data/schemas";
import { RuleRow } from "./RuleRow";

const rise: AlertRule = { id: "r-1", shopId: "s1", enabled: true, kind: "aspect_rise", params: { aspectId: "wait", thresholdPts: 10 } };

describe("RuleRow", () => {
  it("turns a rule off with its switch", () => {
    const onToggle = vi.fn();
    render(<RuleRow rule={rise} aspectName="Wait time" onToggle={onToggle} onSave={vi.fn()} onDelete={vi.fn()} />);
    const toggle = screen.getByRole("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledWith("r-1", false);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("describes an aspect rule in a sentence with the aspect's name", () => {
    render(<RuleRow rule={rise} aspectName="Wait time" onToggle={vi.fn()} onSave={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("When complaints about Wait time rise by 10 points in a week")).toBeTruthy();
  });

  it("describes the other kinds of rule", () => {
    const rules: AlertRule[] = [
      { id: "r-2", shopId: "s1", enabled: true, kind: "rating_below", params: { stars: 3.5 } },
      { id: "r-3", shopId: "s1", enabled: true, kind: "new_aspect", params: {} },
      { id: "r-4", shopId: "s1", enabled: true, kind: "digest", params: { weekday: "mon" } },
    ];
    for (const rule of rules) render(<RuleRow rule={rule} aspectName={null} onToggle={vi.fn()} onSave={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("When the average rating falls below 3.5★")).toBeTruthy();
    expect(screen.getByText("When customers start talking about something new")).toBeTruthy();
    expect(screen.getByText("Weekly summary every Monday")).toBeTruthy();
  });

  it("refuses a threshold above 50 points", () => {
    const onSave = vi.fn();
    render(<RuleRow rule={rise} aspectName="Wait time" onToggle={vi.fn()} onSave={onSave} onDelete={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Points"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Use a number from 1 to 50")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves a new threshold", () => {
    const onSave = vi.fn();
    render(<RuleRow rule={rise} aspectName="Wait time" onToggle={vi.fn()} onSave={onSave} onDelete={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Points"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({ ...rise, params: { aspectId: "wait", thresholdPts: 15 } });
  });
});
