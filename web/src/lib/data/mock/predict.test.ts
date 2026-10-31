import { describe, expect, it } from "vitest";
import { PredictionSchema } from "../schemas";
import { buildDb } from "./build";
import { predictText } from "./predict";
import { SHOP_DEFS } from "./shops";

const aspects = buildDb(SHOP_DEFS).get("saffron-table")!.aspects;

describe("predictText", () => {
  it("scores each aspect by the sentence it appears in", () => {
    const p = predictText("The food was excellent but the wait was terrible.", aspects);
    PredictionSchema.parse(p);
    expect(p.aspects).toEqual([
      { id: "food", name: "Food", sentiment: "positive" },
      { id: "wait-time", name: "Wait time", sentiment: "negative" },
    ]);
    expect(p.sentiment).toBe("neutral");
  });

  it("calls a clearly happy review positive", () => {
    const p = predictText("Lovely ambience and friendly staff, great value.", aspects);
    expect(p.sentiment).toBe("positive");
    expect(p.score).toBeGreaterThan(0.2);
  });

  it("marks sentiment words on the tokens and keeps the text intact", () => {
    const text = "Terrible service!  Never again.";
    const p = predictText(text, aspects);
    expect(p.tokens.map((t) => t.text).join("")).toBe(text);
    expect(p.tokens.find((t) => t.text === "Terrible")?.tone).toBe("negative");
    expect(p.tokens.find((t) => t.text === "service")?.aspectId).toBe("service");
  });

  it("is neutral with low confidence when there are no signal words", () => {
    const p = predictText("We went on Tuesday.", aspects);
    expect(p).toMatchObject({ sentiment: "neutral", score: 0, confidence: 0.3, aspects: [] });
  });
});
