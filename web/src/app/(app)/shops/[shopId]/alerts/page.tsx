import Link from "next/link";
import { Suspense } from "react";
import { deleteRule, markAllRead, saveRule, toggleRule } from "@/app/actions/alerts";
import { AlertFeed } from "@/components/alerts/AlertFeed";
import { AlertRules } from "@/components/alerts/AlertRules";
import { BUTTON_QUIET } from "@/components/forms/Field";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { data } from "@/lib/data";
import { loadShopForViewer } from "@/lib/data/load";

export default function AlertsPage({ params }: PageProps<"/shops/[shopId]/alerts">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading alerts" />}>
      <AlertsLoader params={params} />
    </Suspense>
  );
}

async function AlertsLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { shop, viewerId } = await loadShopForViewer(shopId, `/shops/${shopId}/alerts`, { ownerOnly: true });
  const [rules, events, aspects, user] = await Promise.all([
    data.listAlertRules(shopId),
    data.listAlertEvents(shopId),
    data.getAspects(shopId),
    viewerId ? data.getUser(viewerId) : null,
  ]);
  const unread = events.some((e) => !e.read);

  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · alerts`} title="Alerts">
        Alerts go to {user?.alertEmail ?? "your email"}.{" "}
        <Link href="/app/settings" className="text-ink underline underline-offset-2 hover:text-accent">Change</Link>
      </PageHeader>
      <div className="mt-6 grid gap-8 xl:grid-cols-[3fr_2fr]">
        <section aria-labelledby="rules-title" className="grid content-start gap-3">
          <h2 id="rules-title" className="font-serif text-2xl">Rules</h2>
          <AlertRules
            shopId={shopId}
            rules={rules}
            aspects={(aspects ?? []).map((a) => ({ id: a.id, name: a.name }))}
            actions={{ saveRule, toggleRule, deleteRule }}
          />
        </section>
        <section aria-labelledby="feed-title" className="grid content-start gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="feed-title" className="font-serif text-2xl">Recent alerts</h2>
            {unread && (
              <form
                action={async () => {
                  "use server";
                  await markAllRead(shopId);
                }}
              >
                <button type="submit" className={BUTTON_QUIET}>Mark all read</button>
              </form>
            )}
          </div>
          <AlertFeed events={events} />
        </section>
      </div>
    </div>
  );
}
