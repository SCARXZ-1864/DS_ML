import { Suspense } from "react";
import { IssuesView } from "@/components/issues/IssuesView";
import { EmptyShop } from "@/components/shop/EmptyShop";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { data } from "@/lib/data";
import { findIssues } from "@/lib/data/issues";
import { loadShopForViewer } from "@/lib/data/load";

export default function IssuesPage({ params }: PageProps<"/shops/[shopId]/issues">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading issues" />}>
      <IssuesLoader params={params} />
    </Suspense>
  );
}

async function IssuesLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop, canManage } = await loadShopForViewer(shopId, `/shops/${shopId}/issues`);
  if (shop.reviewCount === 0) return <EmptyShop shop={shop} canManage={canManage} />;
  const issues = findIssues((await data.getAspects(shopId)) ?? [], shop.reviewCount);
  const reviews = await data.getReviewsByIds(shopId, issues.flatMap((i) => i.reviewIds));
  return <IssuesView shop={shop} issues={issues} reviews={reviews} />;
}
