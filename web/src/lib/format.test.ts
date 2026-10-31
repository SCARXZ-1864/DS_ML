import { describe, expect, it } from "vitest";
import { fmtDate, fmtInt, fmtMonth, fmtPct, fmtSigned, fmtStars, shopTypeLabel } from "./format";

describe("formatters", () => {
  it("formats integers with thousands separators", () => expect(fmtInt(8412)).toBe("8,412"));
  it("formats percentages and shows a dash for missing values", () => {
    expect(fmtPct(71.43)).toBe("71.4%");
    expect(fmtPct(null)).toBe("—");
  });
  it("formats star averages", () => {
    expect(fmtStars(4.123)).toBe("4.12");
    expect(fmtStars(null)).toBe("—");
  });
  it("formats month keys", () => {
    expect(fmtMonth("2026-10")).toBe("Oct 2026");
    expect(fmtMonth("2024-01")).toBe("Jan 2024");
  });
  it("signs numbers with a real minus sign", () => {
    expect(fmtSigned(12)).toBe("+12");
    expect(fmtSigned(-12)).toBe("−12");
    expect(fmtSigned(0)).toBe("0");
    expect(fmtSigned(null)).toBe("—");
  });
  it("labels shop types", () => expect(shopTypeLabel("electronics")).toBe("Electronics & appliances"));
});

describe("fmtDate", () => {
  it("formats ISO dates for people", () => expect(fmtDate("2026-10-04")).toBe("4 Oct 2026"));
});
