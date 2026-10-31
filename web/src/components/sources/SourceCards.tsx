"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BUTTON, BUTTON_QUIET } from "@/components/forms/Field";
import type { ActionState, Source } from "@/lib/data/schemas";
import { fmtDate, fmtInt } from "@/lib/format";
import { SyncStatus } from "./SyncStatus";

type SourceAction = (shopId: string, sourceId: string) => Promise<ActionState>;
type Props = { shopId: string; sources: Source[]; syncAction: SourceAction; disconnectAction: SourceAction };

const STATUS: Record<Source["status"], { text: string; className: string }> = {
  connected: { text: "Connected", className: "text-pos" },
  syncing: { text: "Syncing…", className: "text-accent" },
  error: { text: "Needs attention", className: "text-neg" },
  disconnected: { text: "Not connected", className: "text-muted" },
};

function GoogleCard({ shopId, source, syncAction, disconnectAction }: { shopId: string; source: Source | null } & Omit<Props, "shopId" | "sources">) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const live = source && source.status !== "disconnected" ? source : null;
  const run = (action: SourceAction) =>
    startTransition(async () => {
      setMessage(null);
      const result = await action(shopId, live!.id);
      if (!result.ok) setMessage(result.message ?? "Something went wrong.");
      setConfirming(false);
    });

  return (
    <section className="grid content-start gap-3 border border-line bg-panel p-5" aria-labelledby="google-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="google-title" className="font-serif text-xl">Google Business Profile</h2>
        <span className={`text-sm ${STATUS[live?.status ?? "disconnected"].className}`}>{STATUS[live?.status ?? "disconnected"].text}</span>
      </div>
      {live ? (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Location</dt>
            <dd className="m-0">{live.locationName}</dd>
            <dt className="text-muted">Account</dt>
            <dd className="m-0">{live.accountLabel}</dd>
            <dt className="text-muted">Last sync</dt>
            <dd className="m-0 font-mono">{live.lastSyncAt ? fmtDate(live.lastSyncAt.slice(0, 10)) : "—"}</dd>
            <dt className="text-muted">Imported</dt>
            <dd className="m-0 font-mono">{fmtInt(live.reviewsImported)} reviews</dd>
          </dl>
          <p className="text-sm text-muted">Checks for new reviews every day.</p>
          {message && <p role="alert" className="text-sm text-neg">{message}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => run(syncAction)} disabled={pending || live.status === "syncing"} className={BUTTON_QUIET}>
              Sync now
            </button>
            {confirming ? (
              <>
                <button type="button" onClick={() => run(disconnectAction)} disabled={pending} className={`${BUTTON_QUIET} border-neg text-neg`}>
                  Yes, disconnect
                </button>
                <button type="button" onClick={() => setConfirming(false)} className={BUTTON_QUIET}>Keep</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={BUTTON_QUIET}>Disconnect</button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Import every review for your location, then pick up new ones automatically each day.</p>
          <Link href={`/shops/${shopId}/sources/connect`} className={`${BUTTON} justify-self-start`}>
            Connect Google Business Profile
          </Link>
        </>
      )}
    </section>
  );
}

/** Where a shop's reviews come from: a connected Google profile and/or CSV uploads. */
export function SourceCards({ shopId, sources, syncAction, disconnectAction }: Props) {
  const google = sources.find((s) => s.kind === "google") ?? null;
  const csv = sources.find((s) => s.kind === "csv") ?? null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SyncStatus syncing={sources.some((s) => s.status === "syncing")} />
      <GoogleCard shopId={shopId} source={google} syncAction={syncAction} disconnectAction={disconnectAction} />
      <section className="grid content-start gap-3 border border-line bg-panel p-5" aria-labelledby="csv-title">
        <h2 id="csv-title" className="font-serif text-xl">CSV upload</h2>
        <p className="text-sm text-muted">
          {csv
            ? `${fmtInt(csv.reviewsImported)} reviews imported from files so far.`
            : "Export reviews from another app or a spreadsheet and upload them here."}
        </p>
        <Link href={`/shops/${shopId}/uploads`} className={`${BUTTON_QUIET} justify-self-start py-2`}>
          Go to uploads
        </Link>
      </section>
    </div>
  );
}
