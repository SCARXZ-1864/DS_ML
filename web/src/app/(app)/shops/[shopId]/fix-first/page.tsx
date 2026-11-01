import { Suspense } from "react";
import { FixFirstView } from "@/components/issues/FixFirstView";
import { EmptyShop } from "@/components/shop/EmptyShop";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { data } from "@/lib/data";
import { findIssues, rankFixFirst } from "@/lib/data/issues";
import { loadShopForViewer } from "@/lib/data/load";

export default function FixFirstPage({ params }: PageProps<"/shops/[shopId]/fix-first">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading what to fix first" />}>
      <FixFirstLoader params={params} />
    </Suspense>
  );
}

async function FixFirstLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop, canManage } = await loadShopForViewer(shopId, `/shops/${shopId}/fix-first`);
  if (shop.reviewCount === 0) return <EmptyShop shop={shop} canManage={canManage} />;
  const ranked = rankFixFirst(findIssues((await data.getAspects(shopId)) ?? [], shop.reviewCount));
  const reviews = await data.getReviewsByIds(shopId, ranked.flatMap((i) => i.reviewIds));
  return <FixFirstView shop={shop} ranked={ranked} reviews={reviews} />;
}
