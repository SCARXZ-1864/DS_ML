import Link from "next/link";
import { data } from "@/lib/data";
import { shopTypeLabel } from "@/lib/format";

// Temporary start page; the real landing page arrives in checkpoint 4.
export default async function Home() {
  const shops = await data.listShops();
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="label text-accent">Review Intelligence · preview build</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight">Find out what your customers actually complain about.</h1>
      <p className="mt-4 text-muted">Pick a shop to open its overview.</p>
      <ul className="mt-8 grid list-none gap-3 p-0 sm:grid-cols-2">
        {shops.map((s) => (
          <li key={s.id}>
            <Link href={`/shops/${s.id}/overview`} className="block border border-line bg-panel p-4 transition-colors hover:border-accent">
              <span className="label">
                {shopTypeLabel(s.type)}
                {s.isDemo ? " · demo" : " · your shop"}
              </span>
              <span className="mt-1 block font-serif text-xl">{s.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
