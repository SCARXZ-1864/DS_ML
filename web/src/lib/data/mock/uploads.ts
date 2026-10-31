import { aspectInRange } from "../derive";
import type { Aspect, Change, Upload, UploadRequest, UploadStage } from "../schemas";
import { attachData, findShop, getStore, patchShop, seedOnce, type Store } from "./store";

// Simulated processing: an upload only stores when it started. Its stages are worked out
// from how much time has passed, so there are no timers to run or clean up, and the client
// just polls — the same shape as the real background jobs in Part 4.

export const STAGES: [name: string, seconds: number][] = [
  ["Reading file", 1],
  ["Cleaning rows", 1],
  ["Scoring sentiment", 3],
  ["Finding aspects", 3],
  ["Updating dashboard", 1],
];
const FAIL_STAGE = 2;
export const FAIL_MESSAGE = "The sentiment model didn't respond. Nothing was changed. Try again in a minute.";

export type StoredUpload = {
  id: string;
  shopId: string;
  fileName: string;
  startedMs: number;
  rowsAccepted: number;
  rowsSkipped: Upload["rowsSkipped"];
  /** Filled in when processing finishes and the shop is updated (once). */
  changes: Change[] | null;
};

const fails = (u: StoredUpload) => /fail/i.test(u.fileName);

function stagesAt(u: StoredUpload, nowMs: number): { stages: UploadStage[]; status: Upload["status"] } {
  const elapsed = (nowMs - u.startedMs) / 1000;
  let start = 0;
  let status: Upload["status"] = "done";
  const stages = STAGES.map(([name, seconds], i): UploadStage => {
    const end = start + seconds;
    const begun = elapsed >= start;
    start = end;
    if (status === "failed") return { name, status: "pending" };
    if (fails(u) && i === FAIL_STAGE && elapsed >= end) {
      status = "failed";
      return { name, status: "failed" };
    }
    if (elapsed >= end) return { name, status: "done", seconds };
    status = "processing";
    return { name, status: begun ? "running" : "pending" };
  });
  return { stages, status };
}

const NOTE: Record<Change["kind"], (name: string, pts: number) => string> = {
  rise: (n, p) => `Complaints about ${n} rose ${p} points`,
  fall: (n, p) => `Complaints about ${n} fell ${p} points`,
  new_aspect: (n) => `Customers started mentioning ${n}`,
};

/** What changed between two snapshots of a shop's aspects: complaint shares that moved, and new aspects. */
export function detectChanges(before: Aspect[], after: Aspect[], thresholdPts = 5): Change[] {
  const changes: Change[] = [];
  for (const a of after) {
    if (a.mentions === 0) continue;
    const b = before.find((x) => x.id === a.id);
    if (!b || b.mentions === 0) {
      changes.push({ kind: "new_aspect", aspectId: a.id, note: NOTE.new_aspect(a.name, 0) });
      continue;
    }
    const delta = Math.round((a.negPct - b.negPct) * 10) / 10;
    if (Math.abs(delta) < thresholdPts) continue;
    const kind = delta > 0 ? "rise" : "fall";
    changes.push({ kind, aspectId: a.id, deltaPct: delta, note: NOTE[kind](a.name, Math.abs(delta)) });
  }
  return changes;
}

/** Runs once, when an upload is first seen finished: updates the shop and records what changed. */
function apply(u: StoredUpload, nowMs: number): Change[] {
  const store = getStore();
  if (!store.entries.has(u.shopId)) {
    const entry = attachData(u.shopId);
    return (entry?.aspects ?? []).map((a) => ({ kind: "new_aspect", aspectId: a.id, note: NOTE.new_aspect(a.name, 0) }));
  }
  const entry = store.entries.get(u.shopId)!;
  const months = entry.overview.monthly.map((m) => m.month);
  const last = months[months.length - 1];
  const before = months.length > 1 ? entry.aspects.map((a) => aspectInRange(a, { from: months[0], to: months[months.length - 2] })) : [];
  const after = entry.aspects.map((a) => aspectInRange(a, { from: last, to: last }));
  patchShop(u.shopId, {
    reviewCount: entry.shop.reviewCount + u.rowsAccepted,
    lastUploadAt: new Date(nowMs).toISOString().slice(0, 10),
  });
  return detectChanges(before, after);
}

function toUpload(u: StoredUpload, nowMs: number): Upload {
  const { stages, status } = stagesAt(u, nowMs);
  if (status === "done" && u.changes === null) u.changes = apply(u, nowMs);
  return {
    id: u.id,
    shopId: u.shopId,
    fileName: u.fileName,
    createdAt: new Date(u.startedMs).toISOString(),
    status,
    rowsAccepted: u.rowsAccepted,
    rowsSkipped: u.rowsSkipped,
    stages,
    changes: u.changes ?? [],
    ...(status === "failed" ? { error: FAIL_MESSAGE } : {}),
  };
}

const DAY = 86_400_000;

function seed(store: Store) {
  const now = Date.parse("2026-10-31T09:00:00Z");
  const past = (shopId: string, n: number, daysAgo: number, fileName: string, rows: number, changes: Change[]): StoredUpload => ({
    id: `up-${shopId}-${n}`, shopId, fileName, startedMs: now - daysAgo * DAY, rowsAccepted: rows,
    rowsSkipped: { empty: 3, duplicate: 5, invalid: 1 }, changes,
  });
  store.uploads.set("spice-indiranagar", [
    past("spice-indiranagar", 2, 19, "zomato-export-oct.csv", 412, [
      { kind: "rise", aspectId: "wait-time", deltaPct: 6.2, note: "Complaints about Wait time rose 6.2 points" },
    ]),
    past("spice-indiranagar", 1, 49, "zomato-export-sep.csv", 388, []),
  ]);
  store.uploads.set("spice-koramangala", [
    past("spice-koramangala", 2, 28, "reviews-2026-10.csv", 207, [
      { kind: "fall", aspectId: "service", deltaPct: -5.4, note: "Complaints about Service fell 5.4 points" },
    ]),
    past("spice-koramangala", 1, 58, "reviews-2026-09.csv", 195, []),
  ]);
}

const uploads = () => seedOnce("uploads", seed).uploads;

export function listUploadsAt(shopId: string, nowMs: number): Upload[] {
  return (uploads().get(shopId) ?? []).map((u) => toUpload(u, nowMs));
}

export function getUploadAt(shopId: string, uploadId: string, nowMs: number): Upload | null {
  const u = (uploads().get(shopId) ?? []).find((x) => x.id === uploadId);
  return u ? toUpload(u, nowMs) : null;
}

export function startUploadAt(shopId: string, req: UploadRequest, nowMs: number): Upload {
  if (!findShop(shopId)) throw new Error(`Unknown shop ${shopId}`);
  const all = uploads();
  const list = all.get(shopId) ?? [];
  const stored: StoredUpload = {
    id: `up-${shopId}-${list.length + 1}`,
    shopId,
    fileName: req.fileName,
    startedMs: nowMs,
    rowsAccepted: req.rows.length,
    rowsSkipped: req.skipped,
    changes: null,
  };
  all.set(shopId, [stored, ...list]);
  return toUpload(stored, nowMs);
}
