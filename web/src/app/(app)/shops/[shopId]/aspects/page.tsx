import { Suspense } from "react";
import { AspectsView } from "@/components/shop/AspectsView";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { data } from "@/lib/data";
import { requireShop } from "@/lib/data/load";

export default function AspectsPage({ params }: PageProps<"/shops/[shopId]/aspects">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading aspects" />}>
      <AspectsLoader params={params} />
    </Suspense>
  );
}

async function AspectsLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shop = await requireShop(shopId);
  const aspects = (await data.getAspects(shopId)) ?? [];
  const reviews = await data.getReviewsByIds(shopId, aspects.flatMap((a) => a.exampleReviewIds));
  return <AspectsView shop={shop} aspects={aspects} reviews={reviews} />;
}
