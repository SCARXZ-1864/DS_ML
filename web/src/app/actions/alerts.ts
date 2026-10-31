"use server";

import { refresh } from "next/cache";
import { data } from "@/lib/data";
import { ownerGuard } from "@/lib/data/load";
import { type ActionState, AlertRuleSchema } from "@/lib/data/schemas";
import { firstIssue } from "@/lib/api";

const NOT_FOUND: ActionState = { ok: false, message: "Shop not found" };

/** The rule, if it belongs to this shop. Stops an owner editing another shop's rule by id. */
async function ownRule(shopId: string, ruleId: string) {
  return (await data.listAlertRules(shopId)).find((r) => r.id === ruleId) ?? null;
}

export async function saveRule(shopId: string, input: unknown): Promise<ActionState> {
  if ("error" in (await ownerGuard(shopId))) return NOT_FOUND;
  const parsed = AlertRuleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const rule = { ...parsed.data, shopId };
  if (rule.id && !(await ownRule(shopId, rule.id))) return NOT_FOUND;
  await data.saveAlertRule(rule);
  refresh();
  return { ok: true };
}

export async function toggleRule(shopId: string, ruleId: string, enabled: boolean): Promise<ActionState> {
  if ("error" in (await ownerGuard(shopId))) return NOT_FOUND;
  const rule = await ownRule(shopId, ruleId);
  if (!rule) return NOT_FOUND;
  await data.saveAlertRule({ ...rule, enabled });
  refresh();
  return { ok: true };
}

export async function deleteRule(shopId: string, ruleId: string): Promise<ActionState> {
  if ("error" in (await ownerGuard(shopId))) return NOT_FOUND;
  if (!(await ownRule(shopId, ruleId))) return NOT_FOUND;
  await data.deleteAlertRule(shopId, ruleId);
  refresh();
  return { ok: true };
}

export async function markAllRead(shopId: string): Promise<ActionState> {
  if ("error" in (await ownerGuard(shopId))) return NOT_FOUND;
  await data.markAlertsRead(shopId);
  refresh();
  return { ok: true };
}
