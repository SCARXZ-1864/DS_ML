"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Shop } from "@/lib/data/schemas";
import { shopTypeLabel } from "@/lib/format";
import { visibleNav } from "./shop-nav";

type Props = { shops: Shop[]; current: Shop | null };

const ITEM =
  "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm data-[selected=true]:bg-panel data-[selected=true]:shadow-[inset_2px_0_0_var(--color-accent)]";
const GROUP = "[&_[cmdk-group-heading]]:label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5";

/** Ctrl+K (⌘K on Mac) quick search for pages and shops, built on cmdk (the library behind shadcn's Command). */
export function CommandPalette({ shops, current }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between border border-line px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-ink"
      >
        <span>Search</span>
        <kbd className="border border-line px-1 font-mono text-[11px]">Ctrl K</kbd>
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Jump to a page or shop"
        overlayClassName="fixed inset-0 z-40 bg-bg/70"
        contentClassName="fixed left-1/2 top-[14vh] z-50 w-[min(32rem,92vw)] -translate-x-1/2 border border-line bg-panel-2 text-ink shadow-2xl"
      >
        <Command.Input
          placeholder="Jump to a page or shop…"
          className="w-full border-b border-line bg-transparent px-4 py-3 text-base placeholder:text-muted focus:outline-none"
        />
        <Command.List className="max-h-80 overflow-auto p-1.5">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">No matches.</Command.Empty>
          {current && (
            <Command.Group heading={current.name} className={GROUP}>
              {visibleNav(current.isDemo).map((item) => (
                <Command.Item key={item.slug} value={`${item.label} page`} onSelect={() => go(`/shops/${current.id}/${item.slug}`)} className={ITEM}>
                  {item.label}
                  <span className="text-xs text-muted">page</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading="Shops" className={GROUP}>
            {shops.map((s) => (
              <Command.Item key={s.id} value={`${s.name} ${shopTypeLabel(s.type)}`} onSelect={() => go(`/shops/${s.id}/overview`)} className={ITEM}>
                {s.name}
                <span className="text-xs text-muted">{shopTypeLabel(s.type)}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
