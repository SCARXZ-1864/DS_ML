import { Suspense } from "react";
import { EmptyShop } from "@/components/shop/EmptyShop";
import { AspectsView } from "@/components/shop/AspectsView";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { data } from "@/lib/data";
import { loadShopForViewer } from "@/lib/data/load";

export default function AspectsPage({ params }: PageProps<"/shops/[shopId]/aspects">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading aspects" />}>
      <AspectsLoader params={params} />
    </Suspense>
  );
}

async function AspectsLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop, canManage } = await loadShopForViewer(shopId, `/shops/${shopId}/aspects`);
  if (shop.reviewCount === 0) return <EmptyShop shop={shop} canManage={canManage} />;
  const aspects = (await data.getAspects(shopId)) ?? [];
  const reviews = await data.getReviewsByIds(shopId, aspects.flatMap((a) => a.exampleReviewIds));
  return <AspectsView shop={shop} aspects={aspects} reviews={reviews} />;
}
