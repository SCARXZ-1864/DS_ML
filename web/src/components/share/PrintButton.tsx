"use client";

import { BUTTON_QUIET } from "@/components/forms/Field";

/** Opens the browser's print dialog, where the report can also be saved as a PDF. Hidden on paper. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={`${BUTTON_QUIET} print:hidden`}>
      Print or save as PDF
    </button>
  );
}
