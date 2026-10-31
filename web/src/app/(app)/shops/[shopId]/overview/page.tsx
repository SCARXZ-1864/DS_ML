import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OverviewSkeleton } from "@/components/shop/OverviewSkeleton";
import { OverviewView } from "@/components/shop/OverviewView";
import { data } from "@/lib/data";
import { loadShopForViewer } from "@/lib/data/load";

export default function OverviewPage({ params }: PageProps<"/shops/[shopId]/overview">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewLoader params={params} />
    </Suspense>
  );
}

async function OverviewLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop } = await loadShopForViewer(shopId, `/shops/${shopId}/overview`);
  const [overview, aspects] = await Promise.all([data.getOverview(shopId), data.getAspects(shopId)]);
  if (!overview || !aspects) notFound();
  const reviews = await data.getReviewsByIds(shopId, aspects.flatMap((a) => a.exampleReviewIds));
  return <OverviewView shop={shop} overview={overview} aspects={aspects} reviews={reviews} />;
}
