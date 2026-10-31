import { Suspense } from "react";
import { createShopAction } from "@/app/actions/shops";
import { NewShopForm } from "@/components/owner/NewShopForm";
import { PageHeader } from "@/components/shop/PageHeader";
import { requireUser } from "@/lib/auth/user";

export default function NewShopPage() {
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow="My shops" title="Add a shop">
        Next you choose where its reviews come from: your Google Business Profile or a CSV file.
      </PageHeader>
      <div className="mt-6">
        <Suspense fallback={<div className="h-48" aria-hidden />}>
          <Guarded />
        </Suspense>
      </div>
    </div>
  );
}

async function Guarded() {
  await requireUser("/app/shops/new");
  return <NewShopForm action={createShopAction} />;
}
