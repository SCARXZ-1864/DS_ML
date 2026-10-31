import type { UploadStage } from "@/lib/data/schemas";

const MARK: Record<UploadStage["status"], { icon: string; className: string; label: string }> = {
  pending: { icon: "○", className: "text-muted", label: "waiting" },
  running: { icon: "◐", className: "text-accent animate-pulse motion-reduce:animate-none", label: "in progress" },
  done: { icon: "✓", className: "text-pos animate-pop", label: "done" },
  failed: { icon: "✕", className: "text-neg", label: "failed" },
};

/** The processing steps with live status; each finished step shows how long it took. */
export function ProcessingStages({ stages }: { stages: UploadStage[] }) {
  return (
    <ol className="m-0 grid list-none gap-2 p-0" aria-live="polite">
      {stages.map((s) => {
        const m = MARK[s.status];
        return (
          <li key={s.name} className="flex items-center gap-3 border border-line bg-panel px-4 py-3">
            <span aria-hidden className={`w-4 text-center font-mono ${m.className}`}>{m.icon}</span>
            <span className={s.status === "pending" ? "text-muted" : "text-ink"}>{s.name}</span>
            <span className="sr-only">: {m.label}</span>
            {s.seconds !== undefined && s.status === "done" && <span className="ml-auto font-mono text-xs text-muted">{s.seconds}s</span>}
          </li>
        );
      })}
    </ol>
  );
}
