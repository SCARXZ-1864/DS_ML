import { Suspense } from "react";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { UploadWizard } from "@/components/upload/UploadWizard";
import { loadShopForViewer } from "@/lib/data/load";

export default function NewUploadPage({ params }: PageProps<"/shops/[shopId]/uploads/new">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading" />}>
      <NewUploadLoader params={params} />
    </Suspense>
  );
}

async function NewUploadLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop } = await loadShopForViewer(shopId, `/shops/${shopId}/uploads/new`, { ownerOnly: true });
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · uploads`} title="Upload reviews">
        The file is read in your browser; only the review text, rating and date are sent.
      </PageHeader>
      <div className="mt-6">
        <UploadWizard shopId={shopId} />
      </div>
    </div>
  );
}
