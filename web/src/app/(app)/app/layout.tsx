import { Suspense } from "react";
import { logout } from "@/app/actions/auth";
import { Sidebar } from "@/components/shop/Sidebar";
import { getSessionUserId } from "@/lib/auth/session";
import { data } from "@/lib/data";

// The owner area: same shell as the shop pages, with no current shop. Each page checks the
// session itself (requireUser), so a logged-out visitor is sent to log in and back.
export default function OwnerLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="grid min-h-screen md:grid-cols-[15rem_1fr]">
      <Suspense fallback={<aside aria-hidden className="hidden border-r border-line md:block" />}>
        <OwnerSidebar />
      </Suspense>
      <main id="main" className="min-w-0 px-4 pb-24 md:px-8">
        {children}
      </main>
    </div>
  );
}

async function OwnerSidebar() {
  const viewerId = await getSessionUserId();
  const [shops, user] = await Promise.all([data.listShops(viewerId), viewerId ? data.getUser(viewerId) : null]);
  return <Sidebar shops={shops} current={null} canManage={false} user={user ? { name: user.name } : null} logoutAction={logout} />;
}
