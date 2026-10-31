"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_MS = 2000;

/** While a sync runs, re-renders the page every 2 s so the status and counts update by themselves. */
export function SyncStatus({ syncing }: { syncing: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!syncing) return;
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [syncing, router]);
  return null;
}
