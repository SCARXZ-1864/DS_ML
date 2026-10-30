import { Suspense } from "react";
import { DemoBar } from "@/components/shop/DemoBar";
import { Sidebar } from "@/components/shop/Sidebar";
import { data } from "@/lib/data";

// Params are request data under cacheComponents, so they're read inside Suspense
// boundaries. The rest of the shell stays in the static, instantly loading part.
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
  const [shops, current] = await Promise.all([data.listShops(), data.getShop(shopId)]);
  return <Sidebar shops={shops} current={current} />;
}

async function ShopDemoBar({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shop = await data.getShop(shopId);
  return shop ? <DemoBar shop={shop} /> : null;
}
