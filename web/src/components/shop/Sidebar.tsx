"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Shop } from "@/lib/data/schemas";
import { CommandPalette } from "./CommandPalette";
import { type ShopNavItem, visibleNav } from "./shop-nav";
import { ShopSwitcher } from "./ShopSwitcher";

type Props = {
  shops: Shop[];
  current: Shop | null;
  canManage: boolean;
  user: { name: string } | null;
  /** The logout Server Action, passed in so this client component never imports server code. */
  logoutAction?: () => Promise<void>;
};
type Item = { key: string; label: string; href: string; badge?: number };

const LINK =
  "flex items-center justify-between border-l-2 border-transparent px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink aria-[current=page]:border-accent aria-[current=page]:bg-accent/10 aria-[current=page]:text-ink";

function NavList({ items, pathname }: { items: Item[]; pathname: string }) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item) => (
        <li key={item.key}>
          <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={LINK}>
            {item.label}
            {!!item.badge && (
              <span className="bg-neg px-1.5 font-mono text-[11px] text-bg">
                {item.badge}
                <span className="sr-only"> new</span>
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Sidebar({ shops, current, canManage, user, logoutAction }: Props) {
  const pathname = usePathname();
  const shopItems = (shop: Shop, list: ShopNavItem[]): Item[] =>
    list.map((i) => ({
      key: i.slug,
      label: i.label,
      href: `/shops/${shop.id}/${i.slug}`,
      badge: i.slug === "alerts" ? shop.unreadAlerts : 0,
    }));
  const nav = visibleNav(canManage);

  return (
    <aside className="sticky top-0 hidden h-screen flex-col gap-1 overflow-y-auto border-r border-line bg-panel-2/60 px-3.5 py-4 md:flex">
      <Link href="/" className="font-serif text-lg">
        Review <span className="text-accent">Intelligence</span>
      </Link>
      <div className="my-4 grid gap-2">
        <ShopSwitcher shops={shops} currentId={current?.id ?? null} />
        <CommandPalette shops={shops} current={current} canManage={canManage} />
      </div>
      {current && (
        <nav aria-label="Shop pages" className="grid gap-3">
          <div>
            <p className="label px-2.5 pb-1">Analyse</p>
            <NavList items={shopItems(current, nav.filter((i) => !i.ownerOnly))} pathname={pathname} />
          </div>
          {canManage && (
            <div>
              <p className="label px-2.5 pb-1">Manage</p>
              <NavList items={shopItems(current, nav.filter((i) => i.ownerOnly))} pathname={pathname} />
            </div>
          )}
        </nav>
      )}
      <div className="mt-auto border-t border-line pt-3">
        {user ? (
          <nav aria-label="Account">
            <p className="label truncate px-2.5 pb-1" title={user.name}>{user.name}</p>
            <NavList
              pathname={pathname}
              items={[
                { key: "app", label: "My shops", href: "/app" },
                { key: "compare", label: "Compare", href: "/app/compare" },
                { key: "settings", label: "Settings", href: "/app/settings" },
              ]}
            />
            <form action={logoutAction}>
              <button type="submit" className="w-full px-2.5 py-1.5 text-left text-sm text-muted hover:text-ink">
                Log out
              </button>
            </form>
          </nav>
        ) : (
          <Link href="/login" className="block px-2.5 py-1.5 text-sm text-muted hover:text-ink">
            Log in
          </Link>
        )}
      </div>
    </aside>
  );
}
