import type { Metadata } from "next";
import { Suspense } from "react";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeNext } from "@/lib/auth/access";

export const metadata: Metadata = { title: "Log in · Review Intelligence" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="font-serif text-3xl">Log in</h1>
      <p className="mt-2 text-muted">See what customers say about your shops.</p>
      <div className="mt-8 border border-line bg-panel p-6">
        <Suspense fallback={<div className="h-72" aria-hidden />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

// searchParams are request data, so they're read inside the Suspense boundary.
async function Form({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { next } = await searchParams;
  return <AuthForm mode="login" action={login} next={safeNext(next)} />;
}
