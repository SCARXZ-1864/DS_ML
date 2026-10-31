// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Upload } from "@/lib/data/schemas";
import { UploadHistory } from "./UploadHistory";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const up = (over: Partial<Upload>): Upload => ({
  id: "up-1", shopId: "s1", fileName: "oct.csv", createdAt: "2026-10-12T09:00:00.000Z", status: "done",
  rowsAccepted: 412, rowsSkipped: { empty: 3, duplicate: 5, invalid: 1 }, stages: [], changes: [], ...over,
});

describe("UploadHistory", () => {
  it("lists uploads with their counts and status", () => {
    render(<UploadHistory shopId="s1" uploads={[up({}), up({ id: "up-2", fileName: "now.csv", status: "processing", rowsAccepted: 7, rowsSkipped: { empty: 0, duplicate: 0, invalid: 0 } })]} />);
    expect(screen.getByText("oct.csv")).toBeTruthy();
    expect(screen.getByText("412")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
    expect(screen.getByText("Processing…")).toBeTruthy();
  });

  it("invites the first upload when there are none", () => {
    render(<UploadHistory shopId="s1" uploads={[]} />);
    expect(screen.getByText("No uploads yet.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Upload a CSV" }).getAttribute("href")).toBe("/shops/s1/uploads/new");
  });
});
