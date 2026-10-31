import { describe, expect, it } from "vitest";
import { checkFile, prepareRows } from "./rows";

const mapping = { 0: "text", 1: "stars", 2: "date" } as const;

describe("prepareRows", () => {
  it("keeps good rows and counts empty, duplicate and invalid ones", () => {
    const { accepted, skipped } = prepareRows(
      [
        ["Great coffee", "5", "2026-10-01"],
        ["   ", "4", "2026-10-01"],
        ["great COFFEE", "5", "2026-10-02"],
        ["Rude staff", "7", "2026-10-03"],
        ["Slow service", "2", "not a date"],
        ["Fine", "", ""],
      ],
      mapping,
    );
    expect(accepted).toEqual([{ text: "Great coffee", stars: 5, date: "2026-10-01" }, { text: "Fine" }]);
    expect(skipped).toEqual({ empty: 1, duplicate: 1, invalid: 2 });
  });

  it("reads day/month/year dates and ISO timestamps", () => {
    const { accepted } = prepareRows([["A", "", "03/10/2026"], ["B", "", "2026-10-04T09:30:00Z"]], mapping);
    expect(accepted.map((r) => r.date)).toEqual(["2026-10-03", "2026-10-04"]);
  });

  it("rejects an impossible calendar date", () => {
    expect(prepareRows([["A", "", "31/02/2026"]], mapping).skipped.invalid).toBe(1);
  });

  it("rejects review text over 5,000 characters", () => {
    expect(prepareRows([["x".repeat(5001)]], { 0: "text" }).skipped.invalid).toBe(1);
  });
});

describe("checkFile", () => {
  it("asks for a CSV", () => {
    expect(checkFile({ name: "reviews.xlsx", size: 10 })).toBe("Upload a .csv file. Excel files can be saved as CSV from File → Save As.");
  });

  it("accepts an upper-case extension", () => expect(checkFile({ name: "R.CSV", size: 10 })).toBeNull());

  it("limits the file size to 10 MB", () => {
    expect(checkFile({ name: "r.csv", size: 10 * 1024 * 1024 + 1 })).toBe("This file is larger than 10 MB.");
  });

  it("limits the number of rows to 5,000", () => {
    expect(checkFile({ name: "r.csv", size: 10 }, 5001)).toBe("This file has 5,001 rows; the limit is 5,000. Split it and upload it in parts.");
  });

  it("explains a header-only file", () => {
    expect(checkFile({ name: "r.csv", size: 10 }, 0)).toBe("This file has a header row but no reviews.");
  });
});
