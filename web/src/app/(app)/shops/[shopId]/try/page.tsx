import { Suspense } from "react";
import { EmptyShop } from "@/components/shop/EmptyShop";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { LiveAnalyzer } from "@/components/try/LiveAnalyzer";
import { data } from "@/lib/data";
import { tryExamples } from "@/lib/data/derive";
import { loadShopForViewer } from "@/lib/data/load";

export default function TryPage({ params }: PageProps<"/shops/[shopId]/try">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading" />}>
      <TryLoader params={params} />
    </Suspense>
  );
}

async function TryLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop, canManage } = await loadShopForViewer(shopId, `/shops/${shopId}/try`);
  if (shop.reviewCount === 0) return <EmptyShop shop={shop} canManage={canManage} />;
  const aspects = (await data.getAspects(shopId)) ?? [];
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · try it`} title="See how a review is read">
        Type a review and watch the sentiment and aspects update as you write.
      </PageHeader>
      <LiveAnalyzer shopId={shopId} examples={tryExamples(aspects)} />
    </div>
  );
}
