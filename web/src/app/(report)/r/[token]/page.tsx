import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ReportView } from "@/components/share/ReportView";
import { data } from "@/lib/data";

// Reports are private to whoever holds the link, so search engines must not index them.
export const metadata: Metadata = { title: "Shared report · Review Intelligence", robots: { index: false, follow: false } };

export default function ReportPage({ params }: PageProps<"/r/[token]">) {
  return (
    <div className="theme-light min-h-screen bg-bg text-ink">
      <Suspense fallback={<div className="h-96" aria-hidden />}>
        <Report params={params} />
      </Suspense>
    </div>
  );
}

async function Report({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Opening the report counts a view, so it must run on every request.
  await connection();
  const report = await data.getReport(token);
  if (!report) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <h1 className="font-serif text-3xl">This report link is no longer active.</h1>
        <p className="mt-3 text-muted">Ask whoever sent it for a new link.</p>
        <Link href="/" className="mt-6 inline-block underline underline-offset-2">Go to Review Intelligence</Link>
      </main>
    );
  }
  return (
    <main>
      <ReportView report={report} />
    </main>
  );
}
