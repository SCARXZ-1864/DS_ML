"use client";

import { useState, useTransition } from "react";
import { BUTTON, INPUT } from "@/components/forms/Field";
import type { ActionState, AlertRule, Weekday } from "@/lib/data/schemas";
import { RuleRow, WEEKDAY } from "./RuleRow";

type Actions = {
  saveRule: (shopId: string, rule: unknown) => Promise<ActionState>;
  toggleRule: (shopId: string, ruleId: string, enabled: boolean) => Promise<ActionState>;
  deleteRule: (shopId: string, ruleId: string) => Promise<ActionState>;
};
type Props = { shopId: string; rules: AlertRule[]; aspects: { id: string; name: string }[]; actions: Actions };

const KINDS: { kind: AlertRule["kind"]; label: string }[] = [
  { kind: "aspect_rise", label: "Complaints about an aspect rise" },
  { kind: "rating_below", label: "The average rating drops" },
  { kind: "new_aspect", label: "Customers mention something new" },
  { kind: "digest", label: "A weekly summary" },
];

function AddRuleForm({ shopId, aspects, onAdd }: { shopId: string; aspects: Props["aspects"]; onAdd: (rule: AlertRule) => void }) {
  const [kind, setKind] = useState<AlertRule["kind"]>("aspect_rise");
  const [aspectId, setAspectId] = useState(aspects[0]?.id ?? "");
  const [points, setPoints] = useState("10");
  const [stars, setStars] = useState("3.5");
  const [weekday, setWeekday] = useState<Weekday>("mon");

  const build = (): AlertRule => {
    const base = { id: "", shopId, enabled: true };
    if (kind === "aspect_rise") return { ...base, kind, params: { aspectId, thresholdPts: Number(points) } };
    if (kind === "rating_below") return { ...base, kind, params: { stars: Number(stars) } };
    if (kind === "digest") return { ...base, kind, params: { weekday } };
    return { ...base, kind, params: {} };
  };

  return (
    <form
      className="grid gap-3 border border-dashed border-line p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(build());
      }}
    >
      <label className="grid gap-1.5 text-sm">
        Alert me when
        <select value={kind} onChange={(e) => setKind(e.target.value as AlertRule["kind"])} className={INPUT}>
          {KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
        </select>
      </label>
      {kind === "aspect_rise" && (
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <label className="grid gap-1.5 text-sm">
            Aspect
            <select value={aspectId} onChange={(e) => setAspectId(e.target.value)} className={INPUT}>
              {aspects.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            By points
            <input type="number" min={1} max={50} value={points} onChange={(e) => setPoints(e.target.value)} className={`${INPUT} font-mono`} />
          </label>
        </div>
      )}
      {kind === "rating_below" && (
        <label className="grid gap-1.5 text-sm">
          Below (stars)
          <input type="number" min={1} max={5} step={0.1} value={stars} onChange={(e) => setStars(e.target.value)} className={`${INPUT} font-mono`} />
        </label>
      )}
      {kind === "digest" && (
        <label className="grid gap-1.5 text-sm">
          Every
          <select value={weekday} onChange={(e) => setWeekday(e.target.value as Weekday)} className={INPUT}>
            {(Object.keys(WEEKDAY) as Weekday[]).map((d) => <option key={d} value={d}>{WEEKDAY[d]}</option>)}
          </select>
        </label>
      )}
      {kind === "new_aspect" && <span aria-hidden />}
      <button type="submit" className={BUTTON}>Add rule</button>
    </form>
  );
}

/** The owner's alert rules with on/off switches, editable thresholds and a form to add one. */
export function AlertRules({ shopId, rules, aspects, actions }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const names = Object.fromEntries(aspects.map((a) => [a.id, a.name]));
  const run = (call: () => Promise<ActionState>) =>
    startTransition(async () => {
      const result = await call();
      setMessage(result.ok ? null : (result.message ?? "Couldn't save that change."));
    });

  return (
    <div className="grid gap-3">
      {rules.length === 0 && <p className="text-muted">No rules yet. Add one below.</p>}
      <ul className="m-0 grid list-none gap-2 p-0">
        {rules.map((r) => (
          <RuleRow
            key={`${r.id}-${JSON.stringify(r.params)}`}
            rule={r}
            aspectName={r.kind === "aspect_rise" ? (names[r.params.aspectId] ?? null) : null}
            onToggle={(id, enabled) => run(() => actions.toggleRule(shopId, id, enabled))}
            onSave={(rule) => run(() => actions.saveRule(shopId, rule))}
            onDelete={(id) => run(() => actions.deleteRule(shopId, id))}
          />
        ))}
      </ul>
      {message && <p role="alert" className="text-sm text-neg">{message}</p>}
      <AddRuleForm shopId={shopId} aspects={aspects} onAdd={(rule) => run(() => actions.saveRule(shopId, rule))} />
    </div>
  );
}
