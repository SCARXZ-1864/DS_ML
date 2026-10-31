import { connection } from "next/server";
import { Suspense } from "react";
import { disconnectAction, syncNowAction } from "@/app/actions/sources";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { SourceCards } from "@/components/sources/SourceCards";
import { data } from "@/lib/data";
import { loadShopForViewer } from "@/lib/data/load";

export default function SourcesPage({ params, searchParams }: PageProps<"/shops/[shopId]/sources">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading sources" />}>
      <SourcesLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function SourcesLoader({ params, searchParams }: {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ shopId }, query] = await Promise.all([params, searchParams]);
  const { shop } = await loadShopForViewer(shopId, `/shops/${shopId}/sources`, { ownerOnly: true });
  // Sync status depends on the current time, so this renders per request.
  await connection();
  const sources = await data.listSources(shopId);
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · sources`} title="Where reviews come from">
        {query.new === "1"
          ? "Where do this shop's reviews come from? Connect Google to import them automatically, or upload a CSV."
          : "Connect your Google Business Profile for daily updates, or upload CSV files whenever you like."}
      </PageHeader>
      <div className="mt-6">
        <SourceCards shopId={shopId} sources={sources} syncAction={syncNowAction} disconnectAction={disconnectAction} />
      </div>
    </div>
  );
}
