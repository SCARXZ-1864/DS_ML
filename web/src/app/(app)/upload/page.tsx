import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { getSessionUserId } from "@/lib/auth/session";
import { data } from "@/lib/data";
import { uploadTarget } from "@/lib/upload/target";

// The "Upload reviews" button everywhere points here; it forwards to the right place.
export default function UploadPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Opening upload" />}>
      <UploadRouter />
    </Suspense>
  );
}

async function UploadRouter() {
  const userId = await getSessionUserId();
  const shops = userId ? await data.listShops(userId) : [];
  const target = uploadTarget(userId, shops);
  if (target) redirect(target);
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow="Upload reviews" title="Which shop are these reviews for?">
        Upload a CSV with one review per row. You&apos;ll match its columns on the next screen.
      </PageHeader>
      <ul className="mt-6 grid max-w-xl list-none gap-3 p-0">
        {shops
          .filter((s) => !s.isDemo)
          .map((s) => (
            <li key={s.id}>
              <Link href={`/shops/${s.id}/uploads/new`} className="block border border-line bg-panel p-4 transition-colors hover:border-accent">
                <span className="font-serif text-xl">{s.name}</span>
              </Link>
            </li>
          ))}
        <li>
          <Link href="/app/shops/new" className="block p-2 text-sm text-accent underline-offset-2 hover:underline">
            + Add a new shop
          </Link>
        </li>
      </ul>
    </div>
  );
}
