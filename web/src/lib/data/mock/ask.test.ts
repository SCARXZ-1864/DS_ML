import { describe, expect, it } from "vitest";
import { ChatChunkSchema, type ChatChunk } from "../schemas";
import { buildDb } from "./build";
import { composeAnswer, streamChunks } from "./ask";
import { SHOP_DEFS } from "./shops";

const saffron = buildDb(SHOP_DEFS).get("saffron-table")!;
const ask = (q: string) => composeAnswer(q, saffron.aspects, saffron.reviews);
const text = (chunks: ChatChunk[]) => chunks.map((c) => (c.type === "text" ? c.text : "")).join("");
const cites = (chunks: ChatChunk[]) => chunks.flatMap((c) => (c.type === "citation" ? [c.reviewId] : []));

describe("composeAnswer", () => {
  it("answers a complaint question with the most-complained-about aspect and negative citations", () => {
    const chunks = ask("Why do customers complain?");
    const worst = [...saffron.aspects].sort((a, b) => b.negPct - a.negPct)[0];
    expect(text(chunks).startsWith(`${worst.name}:`)).toBe(true);
    expect(cites(chunks).length).toBeGreaterThan(0);
    for (const id of cites(chunks)) {
      const review = saffron.reviews.find((r) => r.id === id)!;
      expect(review.aspectMentions.some((m) => m.sentiment === "negative")).toBe(true);
    }
    expect(chunks.at(-1)).toEqual({ type: "done" });
  });

  it("answers a praise question with the best-loved aspect", () => {
    const best = [...saffron.aspects].sort((a, b) => b.posPct - a.posPct)[0];
    expect(text(ask("What do people love here?")).startsWith(`${best.name}:`)).toBe(true);
  });

  it("answers about an aspect the question names", () => {
    expect(text(ask("How is the price?"))).toContain("Price:");
  });

  it("declines an off-topic question without citations", () => {
    const chunks = ask("What's the weather tomorrow?");
    expect(text(chunks)).toMatch(/^I couldn't find reviews that answer that\. Try asking about /);
    expect(cites(chunks)).toEqual([]);
  });

  it("only produces chunks that follow the contract", () => {
    ask("Why do customers complain?").forEach((c) => ChatChunkSchema.parse(c));
  });

  it("streams chunks in order", async () => {
    const out: ChatChunk[] = [];
    for await (const c of streamChunks([{ type: "text", text: "a" }, { type: "done" }], 0)) out.push(c);
    expect(out).toEqual([{ type: "text", text: "a" }, { type: "done" }]);
  });
});
