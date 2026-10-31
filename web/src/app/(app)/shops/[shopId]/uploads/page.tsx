import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BUTTON } from "@/components/forms/Field";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { UploadHistory } from "@/components/upload/UploadHistory";
import { data } from "@/lib/data";
import { loadShopForViewer } from "@/lib/data/load";

export default function UploadsPage({ params }: PageProps<"/shops/[shopId]/uploads">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading uploads" />}>
      <UploadsLoader params={params} />
    </Suspense>
  );
}

async function UploadsLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop } = await loadShopForViewer(shopId, `/shops/${shopId}/uploads`, { ownerOnly: true });
  // Upload status depends on the current time, so this must render per request, never prerendered.
  await connection();
  const uploads = await data.listUploads(shopId);
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · uploads`} title="Uploads">
        Import reviews from a CSV file, such as an export from a delivery or booking app.
      </PageHeader>
      <div className="mt-6 grid gap-4">
        {uploads.length > 0 && (
          <Link href={`/shops/${shopId}/uploads/new`} className={`${BUTTON} justify-self-start`}>
            Upload a CSV
          </Link>
        )}
        <UploadHistory shopId={shopId} uploads={uploads} />
      </div>
    </div>
  );
}
