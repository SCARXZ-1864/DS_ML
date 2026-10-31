import { headers } from "next/headers";
import { Suspense } from "react";
import { createLinkAction, revokeLinkAction } from "@/app/actions/share";
import { LinkList } from "@/components/share/LinkList";
import { ShareForm } from "@/components/share/ShareForm";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { data } from "@/lib/data";
import { loadShopForViewer } from "@/lib/data/load";

export default function SharePage({ params }: PageProps<"/shops/[shopId]/share">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading share links" />}>
      <ShareLoader params={params} />
    </Suspense>
  );
}

async function ShareLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop } = await loadShopForViewer(shopId, `/shops/${shopId}/share`, { ownerOnly: true });
  const [links, h] = await Promise.all([data.listShareLinks(shopId), headers()]);
  // Full links (for Copy) need this site's address, taken from the request.
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · share`} title="Share a report">
        Anyone with the link can read the report without an account. Revoke a link to stop it working.
      </PageHeader>
      <div className="mt-6 grid gap-8 xl:grid-cols-[2fr_3fr]">
        <section aria-labelledby="new-link" className="grid content-start gap-3">
          <h2 id="new-link" className="font-serif text-2xl">New link</h2>
          <ShareForm action={createLinkAction.bind(null, shopId)} />
        </section>
        <section aria-labelledby="links" className="grid content-start gap-3">
          <h2 id="links" className="font-serif text-2xl">Links</h2>
          <LinkList links={links} origin={origin} revokeAction={revokeLinkAction} />
        </section>
      </div>
    </div>
  );
}
