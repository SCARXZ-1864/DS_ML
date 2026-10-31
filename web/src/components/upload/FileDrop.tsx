"use client";

import { useState } from "react";

type Props = { onFile: (file: File) => void; error: string | null };

/** Choose or drop one CSV file. The file is read in the browser; only cleaned rows are sent on. */
export function FileDrop({ onFile, error }: Props) {
  const [over, setOver] = useState(false);
  return (
    <div className="grid gap-3">
      <label
        htmlFor="csv-file"
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile(file);
        }}
        className={`grid cursor-pointer place-items-center gap-2 border border-dashed px-6 py-14 text-center transition-colors ${over ? "border-accent bg-accent/5" : "border-line hover:border-accent"}`}
      >
        <span className="font-serif text-xl">Drop a CSV file here, or click to choose one</span>
        <span className="text-sm text-muted">Up to 5,000 reviews and 10 MB. One review per row, with a header row.</span>
      </label>
      <input
        id="csv-file"
        type="file"
        accept=".csv,text/csv"
        aria-label="Choose a CSV file"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = ""; // lets the same file be chosen again after a fix
        }}
      />
      {error && <p role="alert" className="text-sm text-neg">{error}</p>}
    </div>
  );
}
