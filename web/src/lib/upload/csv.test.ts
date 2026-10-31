import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("handles quoted commas, escaped quotes and CRLF line endings", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });

  it("strips a byte-order mark from the start", () => {
    expect(parseCsv("﻿review\nok")).toEqual([["review"], ["ok"]]);
  });

  it("drops fully blank lines", () => {
    expect(parseCsv("a\n\n  \nb\n")).toEqual([["a"], ["b"]]);
  });

  it("keeps a newline inside a quoted field", () => {
    expect(parseCsv('text\n"line one\nline two"')).toEqual([["text"], ["line one\nline two"]]);
  });

  it("keeps empty fields between commas", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });

  it("returns nothing for an empty file", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
