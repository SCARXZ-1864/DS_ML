// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopComplaints } from "./TopComplaints";

describe("TopComplaints", () => {
  it("lists complaints with their quotes as plain text", () => {
    const { container } = render(
      <TopComplaints items={[{ aspectId: "wait", name: "Wait time", negPct: 47.2, quote: "<b>Waited</b> an hour" }]} />,
    );
    expect(screen.getByText("Wait time")).toBeTruthy();
    expect(screen.getByText("47.2% negative")).toBeTruthy();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("<b>Waited</b> an hour")).toBeTruthy();
  });

  it("truncates a long aspect name instead of pushing the percentage off the row", () => {
    const long = "Delivery packaging and container quality for takeaway orders";
    render(<TopComplaints items={[{ aspectId: "p", name: long, negPct: 40, quote: null }]} />);
    const name = screen.getByTitle(long);
    expect(name.className).toContain("truncate");
    expect(name.className).toContain("min-w-0");
  });

  it("explains when nothing stands out", () => {
    render(<TopComplaints items={[]} />);
    expect(screen.getByText("No clear complaints in this range.")).toBeTruthy();
  });
});
