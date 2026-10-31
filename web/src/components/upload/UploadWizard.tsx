"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BUTTON, BUTTON_QUIET } from "@/components/forms/Field";
import { type ColumnGuess, type ColumnRole, type Upload, UploadSchema } from "@/lib/data/schemas";
import { guessColumns } from "@/lib/upload/columns";
import { parseCsv } from "@/lib/upload/csv";
import { checkFile, prepareRows } from "@/lib/upload/rows";
import { ChangeCards } from "./ChangeCards";
import { ColumnMapper } from "./ColumnMapper";
import { FileDrop } from "./FileDrop";
import { PreviewTable } from "./PreviewTable";
import { ProcessingStages } from "./ProcessingStages";

const POLL_MS = 1000;
const MAX_POLL_FAILURES = 3;
const STEPS = ["File", "Columns", "Preview", "Processing"] as const;

type Parsed = { fileName: string; columns: ColumnGuess[]; rows: string[][] };

async function apiMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error?.message ?? "Something went wrong. Try again.";
}

/** File → which column is which → preview → live processing → what changed. */
export function UploadWizard({ shopId }: { shopId: string }) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [roles, setRoles] = useState<ColumnRole[]>([]);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [starting, setStarting] = useState(false);
  const [lostTrack, setLostTrack] = useState(false);

  const textColumns = roles.filter((r) => r === "text").length;
  const prepared = useMemo(
    () => (parsed && step >= 2 ? prepareRows(parsed.rows, Object.fromEntries(roles.map((r, i) => [i, r]))) : null),
    [parsed, roles, step],
  );

  const reset = () => {
    setParsed(null);
    setRoles([]);
    setUpload(null);
    setError(null);
    setLostTrack(false);
    setStep(0);
  };

  const onFile = async (file: File) => {
    setError(null);
    const early = checkFile(file);
    if (early) return setError(early);
    const all = parseCsv(await file.text());
    if (all.length === 0) return setError("This file is empty.");
    const [header, ...rows] = all;
    const late = checkFile(file, rows.length);
    if (late) return setError(late);
    const columns = guessColumns(header, rows);
    setParsed({ fileName: file.name, columns, rows });
    setRoles(columns.map((c) => c.role));
    setStep(1);
  };

  const start = async () => {
    if (!parsed || !prepared) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/shops/${shopId}/uploads`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: parsed.fileName, rows: prepared.accepted, skipped: prepared.skipped }),
      });
      if (!res.ok) return setError(await apiMessage(res));
      setUpload(UploadSchema.parse(await res.json()));
      setStep(3);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  };

  // Poll while processing. Leaving the page aborts the request and cancels the next poll.
  const pollId = upload?.status === "processing" ? upload.id : null;
  useEffect(() => {
    if (!pollId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const poll = async () => {
      try {
        const res = await fetch(`/api/shops/${shopId}/uploads/${pollId}`, { signal: controller.signal });
        if (!res.ok) throw new Error(await apiMessage(res));
        const next = UploadSchema.parse(await res.json());
        failures = 0;
        setUpload(next);
        if (next.status === "processing") timer = setTimeout(poll, POLL_MS);
      } catch {
        if (controller.signal.aborted) return;
        // One failed check (a network blip) shouldn't end the wizard: the upload keeps going on
        // the server, so try again, and only give up after several failures in a row.
        failures += 1;
        if (failures < MAX_POLL_FAILURES) timer = setTimeout(poll, POLL_MS);
        else setLostTrack(true);
      }
    };
    timer = setTimeout(poll, POLL_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pollId, shopId]);

  return (
    <div className="grid max-w-4xl gap-6">
      <ol className="m-0 flex list-none flex-wrap gap-4 p-0 text-sm" aria-label="Upload steps">
        {STEPS.map((name, i) => (
          <li key={name} aria-current={i === step ? "step" : undefined} className={i === step ? "text-accent" : i < step ? "text-ink" : "text-muted"}>
            <span className="font-mono">{i + 1}</span> {name}
          </li>
        ))}
      </ol>

      {step === 0 && <FileDrop onFile={onFile} error={error} />}

      {step === 1 && parsed && (
        <section className="grid gap-4">
          <p className="text-muted">
            Check what each column of <span className="text-ink">{parsed.fileName}</span> holds. Only the review text is required.
          </p>
          <ColumnMapper columns={parsed.columns} roles={roles} onChange={(i, r) => setRoles((prev) => prev.map((x, j) => (j === i ? r : x)))} />
          {textColumns !== 1 && <p className="text-sm text-accent">Pick the column that holds the review text.</p>}
          <div className="flex gap-3">
            <button type="button" onClick={reset} className={BUTTON_QUIET}>Back</button>
            <button type="button" onClick={() => setStep(2)} disabled={textColumns !== 1} className={BUTTON}>Next</button>
          </div>
        </section>
      )}

      {step === 2 && prepared && (
        <section className="grid gap-4">
          <PreviewTable rows={prepared.accepted.slice(0, 5)} total={prepared.accepted.length} skipped={prepared.skipped} />
          {prepared.accepted.length === 0 && <p className="text-sm text-neg">None of the rows have usable review text.</p>}
          {error && <p role="alert" className="text-sm text-neg">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className={BUTTON_QUIET}>Back</button>
            <button type="button" onClick={start} disabled={starting || prepared.accepted.length === 0} className={BUTTON}>
              {starting ? "Starting…" : "Start import"}
            </button>
          </div>
        </section>
      )}

      {step === 3 && upload && (
        <section className="grid gap-5">
          <ProcessingStages stages={upload.stages} />
          {upload.status === "failed" && (
            <div role="alert" className="border-l-2 border-neg bg-panel px-4 py-3">
              <p>{upload.error ?? "Processing failed."}</p>
              <button type="button" onClick={reset} className={`${BUTTON_QUIET} mt-3`}>Try again</button>
            </div>
          )}
          {lostTrack && upload.status === "processing" && (
            <p role="alert" className="text-sm text-neg">
              Lost track of the upload. It may still be processing.{" "}
              <Link href={`/shops/${shopId}/uploads`} className="text-ink underline underline-offset-2">Check Uploads</Link>
            </p>
          )}
          {upload.status === "done" && (
            <>
              <h2 className="font-serif text-2xl">What changed</h2>
              <ChangeCards changes={upload.changes} />
              <Link href={`/shops/${shopId}/overview`} className={`${BUTTON} justify-self-start`}>View dashboard</Link>
            </>
          )}
        </section>
      )}
    </div>
  );
}
