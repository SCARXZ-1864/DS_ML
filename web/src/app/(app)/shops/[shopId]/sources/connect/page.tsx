import { Suspense } from "react";
import { connectGoogleAction } from "@/app/actions/sources";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { ConnectGoogleFlow } from "@/components/sources/ConnectGoogleFlow";
import { data } from "@/lib/data";
import { loadShopForViewer } from "@/lib/data/load";

export default function ConnectGooglePage({ params }: PageProps<"/shops/[shopId]/sources/connect">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading" />}>
      <ConnectLoader params={params} />
    </Suspense>
  );
}

async function ConnectLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop } = await loadShopForViewer(shopId, `/shops/${shopId}/sources/connect`, { ownerOnly: true });
  const locations = await data.listGoogleLocations(shopId);
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · sources`} title="Connect Google Business Profile">
        Google sends us your reviews; we never see your Google password.
      </PageHeader>
      <div className="mt-6">
        <ConnectGoogleFlow shopId={shopId} shopName={shop.name} locations={locations} connectAction={connectGoogleAction} />
      </div>
    </div>
  );
}
