import type { SharePeriod, ShareSection } from "@/lib/data/schemas";

// Plain constants, in their own module so both server and client components can import them
// (an object exported from a "use client" file reaches server components only as a reference).
export const PERIOD_LABEL: Record<SharePeriod, string> = { "30d": "Last 30 days", "90d": "Last 90 days", all: "All time" };
export const SECTION_LABEL: Record<ShareSection, string> = { overview: "Overview", aspects: "Aspects", quotes: "Quotes" };
