"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BUTTON, BUTTON_QUIET } from "@/components/forms/Field";
import type { ActionState, GoogleLocation } from "@/lib/data/schemas";

type Props = {
  shopId: string;
  shopName: string;
  locations: GoogleLocation[];
  connectAction: (shopId: string, locationId: string) => Promise<ActionState | void>;
};

const PERMISSIONS = ["Read the reviews for your business locations", "See the names and addresses of those locations"];

/**
 * A stand-in for Google's own consent screen, clearly labelled as simulated and styled as part
 * of this app, so it can never be mistaken for a real Google sign-in.
 */
export function ConnectGoogleFlow({ shopId, shopName, locations, connectAction }: Props) {
  const [allowed, setAllowed] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const importReviews = () => {
    if (!locationId) return;
    setError(null);
    startTransition(async () => {
      const result = await connectAction(shopId, locationId);
      if (result && !result.ok) setError(result.message ?? "Couldn't connect. Try again.");
    });
  };

  if (!allowed) {
    return (
      <section className="max-w-xl border border-line bg-panel p-6" aria-labelledby="consent-title">
        <p className="label text-accent">Simulated · no data leaves this demo</p>
        <h2 id="consent-title" className="mt-2 font-serif text-2xl">Simulated Google consent</h2>
        <p className="mt-3 text-sm text-muted">
          In the real app, Google asks you to let Review Intelligence read reviews for your business locations. Nothing
          leaves this demo.
        </p>
        <p className="mt-4 text-sm">Review Intelligence would be able to:</p>
        <ul className="mt-2 grid gap-1 text-sm">
          {PERMISSIONS.map((p) => (
            <li key={p} className="before:mr-2 before:text-pos before:content-['✓']">{p}</li>
          ))}
        </ul>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => setAllowed(true)} className={BUTTON}>Allow</button>
          <Link href={`/shops/${shopId}/sources`} className={`${BUTTON_QUIET} py-2`}>Cancel</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-xl border border-line bg-panel p-6">
      <fieldset className="grid gap-2">
        <legend className="font-serif text-2xl">Choose the location to import</legend>
        <p className="mb-2 text-sm text-muted">Its reviews will appear under {shopName}.</p>
        {locations.map((l) => (
          <label key={l.id} className="flex cursor-pointer items-start gap-3 border border-line px-4 py-3 has-[:checked]:border-accent">
            <input type="radio" name="location" value={l.id} checked={locationId === l.id} onChange={() => setLocationId(l.id)} className="mt-1 accent-accent" />
            <span>
              <span className="block">{l.name}</span>
              <span className="block text-sm text-muted">{l.address}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-neg">{error}</p>}
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={importReviews} disabled={!locationId || pending} className={BUTTON}>
          {pending ? "Connecting…" : "Import reviews"}
        </button>
        <Link href={`/shops/${shopId}/sources`} className={`${BUTTON_QUIET} py-2`}>Cancel</Link>
      </div>
    </section>
  );
}
