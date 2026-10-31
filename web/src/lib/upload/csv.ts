/**
 * Reads CSV text into rows of fields (the common RFC 4180 rules): commas and newlines inside
 * "double quotes" stay part of the field, "" inside quotes is one quote, and both CRLF and LF
 * end a row. A leading byte-order mark and fully blank lines are dropped. Runs in the browser,
 * so the raw file never leaves the user's machine in Part 1.
 */
export function parseCsv(text: string): string[][] {
  const src = text.startsWith("﻿") ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let fieldText = "";
  let inQuotes = false;

  const endField = () => {
    row.push(fieldText);
    fieldText = "";
  };
  const endRow = () => {
    endField();
    if (row.some((f) => f.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') {
        fieldText += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        fieldText += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      endField();
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      endRow();
    } else {
      fieldText += c;
    }
  }
  if (fieldText !== "" || row.length > 0) endRow();
  return rows;
}
