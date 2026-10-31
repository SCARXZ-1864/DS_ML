import { Suspense } from "react";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { ReviewExplorer } from "@/components/shop/ReviewExplorer";
import { data } from "@/lib/data";
import { loadShopForViewer } from "@/lib/data/load";
import { ReviewQuerySchema } from "@/lib/data/schemas";

export default function ReviewsPage({ params }: PageProps<"/shops/[shopId]/reviews">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading reviews" />}>
      <ReviewsLoader params={params} />
    </Suspense>
  );
}

async function ReviewsLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop } = await loadShopForViewer(shopId, `/shops/${shopId}/reviews`);
  const [aspects, initial] = await Promise.all([data.getAspects(shopId), data.getReviews(shopId, ReviewQuerySchema.parse({}))]);
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · reviews`} title="Every review, searchable">
        Filter by sentiment or aspect, sort, and search the text. Aspect mentions are underlined in their sentiment colour.
      </PageHeader>
      <ReviewExplorer shopId={shopId} aspects={aspects ?? []} initial={initial ?? { items: [], nextCursor: null, total: 0 }} />
    </div>
  );
}
