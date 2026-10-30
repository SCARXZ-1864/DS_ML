"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Shop } from "@/lib/data/schemas";
import { shopTypeLabel } from "@/lib/format";

type Props = { shops: Shop[]; currentId: string | null };

export function ShopSwitcher({ shops, currentId }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = shops.find((s) => s.id === currentId) ?? null;
  const owned = shops.filter((s) => !s.isDemo);
  const demos = shops.filter((s) => s.isDemo);

  // Close on a click outside or on Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const group = (label: string, list: Shop[]) => (
    <div className="py-1">
      <p className="label px-3 pt-1.5">{label}</p>
      <ul className="m-0 list-none p-0">
        {list.map((s) => (
          <li key={s.id}>
            <Link
              href={`/shops/${s.id}/overview`}
              aria-current={s.id === currentId ? "page" : undefined}
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-sm hover:bg-panel aria-[current=page]:shadow-[inset_2px_0_0_var(--color-accent)]"
            >
              <span className="block truncate">{s.name}</span>
              <span className="block text-xs text-muted">{shopTypeLabel(s.type)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="shop-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 border border-line bg-panel px-3 py-2 text-left hover:border-accent"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm">{current?.name ?? "Choose a shop"}</span>
          {current && (
            <span className="block text-xs text-muted">
              {shopTypeLabel(current.type)}
              {current.isDemo ? " · demo" : ""}
            </span>
          )}
        </span>
        <span aria-hidden className="text-muted">▾</span>
      </button>
      {open && (
        <div id="shop-menu" className="animate-fade-rise absolute inset-x-0 top-[calc(100%+4px)] z-20 border border-line bg-panel-2 shadow-lg">
          {owned.length > 0 && group("Your shops", owned)}
          {group("Demo shops", demos)}
        </div>
      )}
    </div>
  );
}
