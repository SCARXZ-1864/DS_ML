import { Suspense } from "react";
import { EmptyShop } from "@/components/shop/EmptyShop";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { data } from "@/lib/data";
import { suggestedQuestions } from "@/lib/data/derive";
import { loadShopForViewer } from "@/lib/data/load";

export default function AskPage({ params }: PageProps<"/shops/[shopId]/ask">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading chat" />}>
      <AskLoader params={params} />
    </Suspense>
  );
}

async function AskLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop, canManage } = await loadShopForViewer(shopId, `/shops/${shopId}/ask`);
  if (shop.reviewCount === 0) return <EmptyShop shop={shop} canManage={canManage} />;
  const aspects = (await data.getAspects(shopId)) ?? [];
  const reviews = await data.getReviewsByIds(shopId, aspects.flatMap((a) => a.exampleReviewIds));
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · ask`} title="Ask the reviews">
        Answers come only from this shop&apos;s reviews, and every claim links to the review it came from.
      </PageHeader>
      <ChatPanel
        shopId={shopId}
        suggestions={suggestedQuestions(aspects)}
        reviews={reviews}
        aspectNames={Object.fromEntries(aspects.map((a) => [a.id, a.name]))}
      />
    </div>
  );
}
