import { Suspense } from "react";
import { DemoBar } from "@/components/shop/DemoBar";
import { Sidebar } from "@/components/shop/Sidebar";
import { shopAccess } from "@/lib/auth/access";
import { getSessionUserId } from "@/lib/auth/session";
import { data } from "@/lib/data";

// Params and the session are request data under cacheComponents, so they're read inside
// Suspense boundaries. The rest of the shell stays in the static, instantly loading part.
export default function ShopLayout({ children, params }: LayoutProps<"/shops/[shopId]">) {
  return (
    <div className="grid min-h-screen md:grid-cols-[15rem_1fr]">
      <Suspense fallback={<aside aria-hidden className="hidden border-r border-line md:block" />}>
        <ShopSidebar params={params} />
      </Suspense>
      <main id="main" className="min-w-0 px-4 pb-24 md:px-8">
        <Suspense fallback={null}>
          <ShopDemoBar params={params} />
        </Suspense>
        {children}
      </main>
    </div>
  );
}

async function ShopSidebar({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const viewerId = await getSessionUserId();
  const [shops, shop, ownerId, user] = await Promise.all([
    data.listShops(viewerId),
    data.getShop(shopId),
    data.getShopOwner(shopId),
    viewerId ? data.getUser(viewerId) : null,
  ]);
  // The page itself enforces access; the sidebar just mustn't reveal a shop the viewer can't see.
  const visible = shop && shopAccess(shop, ownerId, viewerId) === "ok" ? shop : null;
  const canManage = !!visible && !visible.isDemo && ownerId === viewerId;
  return <Sidebar shops={shops} current={visible} canManage={canManage} user={user ? { name: user.name } : null} />;
}

async function ShopDemoBar({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shop = await data.getShop(shopId);
  return shop ? <DemoBar shop={shop} /> : null;
}
