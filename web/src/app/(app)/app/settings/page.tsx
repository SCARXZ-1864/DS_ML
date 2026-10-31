import { Suspense } from "react";
import { saveSettings } from "@/app/actions/shops";
import { SettingsForm } from "@/components/owner/SettingsForm";
import { PageHeader } from "@/components/shop/PageHeader";
import { requireUser } from "@/lib/auth/user";

export default function SettingsPage() {
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow="Your account" title="Settings" />
      <div className="mt-6">
        <Suspense fallback={<div className="h-48" aria-hidden />}>
          <Settings />
        </Suspense>
      </div>
    </div>
  );
}

async function Settings() {
  const user = await requireUser("/app/settings");
  return <SettingsForm user={user} action={saveSettings} />;
}
