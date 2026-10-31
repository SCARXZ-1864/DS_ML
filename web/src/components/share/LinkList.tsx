"use client";

import { useState, useTransition } from "react";
import { BUTTON_QUIET } from "@/components/forms/Field";
import type { ActionState, SharePeriod, ShareSection, ShareLink } from "@/lib/data/schemas";
import { fmtDate } from "@/lib/format";

export const PERIOD_LABEL: Record<SharePeriod, string> = { "30d": "Last 30 days", "90d": "Last 90 days", all: "All time" };
export const SECTION_LABEL: Record<ShareSection, string> = { overview: "Overview", aspects: "Aspects", quotes: "Quotes" };

type Props = { links: ShareLink[]; origin: string; revokeAction: (shopId: string, token: string) => Promise<ActionState> };

function LinkRow({ link, origin, revokeAction }: { link: ShareLink } & Omit<Props, "links">) {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const path = `/r/${link.token}`;
  const revoked = link.revokedAt !== null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it instead.");
    }
  };

  return (
    <li className={`grid gap-2 border border-line bg-panel px-4 py-3 ${revoked ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <code className="break-all font-mono text-sm">{origin}{path}</code>
        {revoked ? <span className="label text-neg">Revoked</span> : <span className="text-sm text-muted">{link.views} views</span>}
      </div>
      <p className="text-sm text-muted">
        {PERIOD_LABEL[link.period]} · {link.sections.map((s) => SECTION_LABEL[s]).join(", ")} · created {fmtDate(link.createdAt.slice(0, 10))}
      </p>
      {error && <p role="alert" className="text-sm text-neg">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} disabled={revoked} className={BUTTON_QUIET}>{copied ? "Copied" : "Copy"}</button>
        {!revoked && (
          <a href={path} target="_blank" rel="noreferrer" className={BUTTON_QUIET}>Open</a>
        )}
        {!revoked &&
          (confirming ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await revokeAction(link.shopId, link.token);
                    if (!result.ok) setError(result.message ?? "Couldn't revoke the link.");
                    setConfirming(false);
                  })
                }
                className={`${BUTTON_QUIET} border-neg text-neg`}
              >
                Yes, revoke
              </button>
              <button type="button" onClick={() => setConfirming(false)} className={BUTTON_QUIET}>Keep</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className={BUTTON_QUIET}>Revoke</button>
          ))}
      </div>
    </li>
  );
}

/** The shop's share links. Revoking one stops the report opening for everyone who has it. */
export function LinkList({ links, origin, revokeAction }: Props) {
  if (links.length === 0) return <p className="text-muted">No share links yet. Create one to send a read-only report.</p>;
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {links.map((l) => (
        <LinkRow key={l.token} link={l} origin={origin} revokeAction={revokeAction} />
      ))}
    </ul>
  );
}
