"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Shop } from "@/lib/data/schemas";
import { CommandPalette } from "./CommandPalette";
import { visibleNav } from "./shop-nav";
import { ShopSwitcher } from "./ShopSwitcher";

type Props = { shops: Shop[]; current: Shop | null };

export function Sidebar({ shops, current }: Props) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen flex-col gap-1 border-r border-line bg-panel-2/60 px-3.5 py-4 md:flex">
      <Link href="/" className="font-serif text-lg">
        Review <span className="text-accent">Intelligence</span>
      </Link>
      <div className="my-4 grid gap-2">
        <ShopSwitcher shops={shops} currentId={current?.id ?? null} />
        <CommandPalette shops={shops} current={current} />
      </div>
      {current && (
        <nav aria-label="Shop pages">
          <p className="label px-2.5 pb-1">Analyse</p>
          <ul className="m-0 list-none p-0">
            {visibleNav(current.isDemo).map((item) => {
              const href = `/shops/${current.id}/${item.slug}`;
              const active = pathname === href;
              return (
                <li key={item.slug}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className="block border-l-2 border-transparent px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink aria-[current=page]:border-accent aria-[current=page]:bg-accent/10 aria-[current=page]:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </aside>
  );
}
