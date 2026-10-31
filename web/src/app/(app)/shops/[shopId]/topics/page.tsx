import { Suspense } from "react";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { TopicsView } from "@/components/shop/TopicsView";
import { data } from "@/lib/data";
import { loadShopForViewer } from "@/lib/data/load";

export default function TopicsPage({ params }: PageProps<"/shops/[shopId]/topics">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading topics" />}>
      <TopicsLoader params={params} />
    </Suspense>
  );
}

async function TopicsLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop } = await loadShopForViewer(shopId, `/shops/${shopId}/topics`);
  const topics = (await data.getTopics(shopId)) ?? [];
  const reviews = await data.getReviewsByIds(shopId, topics.flatMap((t) => t.representativeReviewIds));
  return <TopicsView shop={shop} topics={topics} reviews={reviews} />;
}
