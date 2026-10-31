"use client";

import { useState } from "react";
import { BUTTON_QUIET, INPUT } from "@/components/forms/Field";
import type { AlertRule, Weekday } from "@/lib/data/schemas";

export const WEEKDAY: Record<Weekday, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};

/** A rule as a plain sentence, e.g. "When complaints about Wait time rise by 10 points in a week". */
export function describeRule(rule: AlertRule, aspectName: string | null): string {
  switch (rule.kind) {
    case "aspect_rise":
      return `When complaints about ${aspectName ?? "an aspect"} rise by ${rule.params.thresholdPts} points in a week`;
    case "rating_below":
      return `When the average rating falls below ${rule.params.stars}★`;
    case "new_aspect":
      return "When customers start talking about something new";
    case "digest":
      return `Weekly summary every ${WEEKDAY[rule.params.weekday]}`;
  }
}

type Props = {
  rule: AlertRule;
  aspectName: string | null;
  onToggle: (id: string, enabled: boolean) => void;
  onSave: (rule: AlertRule) => void;
  onDelete: (id: string) => void;
};

/** One alert rule: its sentence, an on/off switch, and its threshold when it has one. */
export function RuleRow({ rule, aspectName, onToggle, onSave, onDelete }: Props) {
  const [enabled, setEnabled] = useState(rule.enabled);
  const threshold = rule.kind === "aspect_rise" ? rule.params.thresholdPts : rule.kind === "rating_below" ? rule.params.stars : null;
  const [value, setValue] = useState(threshold === null ? "" : String(threshold));
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const sentenceId = `rule-${rule.id}`;

  const save = () => {
    const n = Number(value);
    if (rule.kind === "aspect_rise") {
      if (!Number.isInteger(n) || n < 1 || n > 50) return setError("Use a number from 1 to 50");
      setError(null);
      onSave({ ...rule, enabled, params: { ...rule.params, thresholdPts: n } });
    } else if (rule.kind === "rating_below") {
      if (!Number.isFinite(n) || n < 1 || n > 5 || value.trim() === "") return setError("Use a rating from 1 to 5");
      setError(null);
      onSave({ ...rule, enabled, params: { stars: n } });
    }
  };

  return (
    <li className="grid gap-3 border border-line bg-panel px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby={sentenceId}
        onClick={() => {
          setEnabled(!enabled);
          onToggle(rule.id, !enabled);
        }}
        className="relative h-6 w-11 shrink-0 rounded-full border border-line bg-panel-2 transition-colors aria-checked:border-pos aria-checked:bg-pos/30"
      >
        <span
          aria-hidden
          className={`absolute top-0.5 h-4 w-4 rounded-full transition-[left] motion-reduce:transition-none ${enabled ? "left-6 bg-pos" : "left-0.5 bg-muted"}`}
        />
      </button>
      <p id={sentenceId} className={enabled ? "text-ink" : "text-muted"}>{describeRule(rule, aspectName)}</p>
      <div className="flex flex-wrap items-center gap-2">
        {threshold !== null && (
          <>
            <label className="sr-only" htmlFor={`${sentenceId}-value`}>{rule.kind === "aspect_rise" ? "Points" : "Stars"}</label>
            <input
              id={`${sentenceId}-value`}
              type="number"
              inputMode="decimal"
              step={rule.kind === "aspect_rise" ? 1 : 0.1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${sentenceId}-error` : undefined}
              className={`${INPUT} w-20 py-1.5 font-mono`}
            />
            <button type="button" onClick={save} className={BUTTON_QUIET}>Save</button>
          </>
        )}
        {confirming ? (
          <>
            <button type="button" onClick={() => onDelete(rule.id)} className={`${BUTTON_QUIET} border-neg text-neg`}>Yes, delete</button>
            <button type="button" onClick={() => setConfirming(false)} className={BUTTON_QUIET}>Keep</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={`${BUTTON_QUIET} text-muted`} aria-label={`Delete rule: ${describeRule(rule, aspectName)}`}>
            Delete
          </button>
        )}
      </div>
      {error && <p id={`${sentenceId}-error`} className="text-sm text-neg sm:col-span-3">{error}</p>}
    </li>
  );
}
