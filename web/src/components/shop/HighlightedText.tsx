import { Fragment } from "react";
import type { Review } from "@/lib/data/schemas";
import { segmentText } from "@/lib/highlight";

const TONE = {
  positive: "border-pos text-pos",
  negative: "border-neg text-neg",
  neutral: "border-accent text-accent",
} as const;

type Props = { text: string; mentions: Review["aspectMentions"]; aspectNames?: Record<string, string> };

/** Review text with each aspect mention underlined in its sentiment colour. Always plain text, never HTML. */
export function HighlightedText({ text, mentions, aspectNames }: Props) {
  return (
    <>
      {segmentText(text, mentions).map((s, i) =>
        s.mention ? (
          <mark key={i} data-tone={s.mention.sentiment} title={aspectNames?.[s.mention.aspectId]} className={`border-b-2 bg-transparent ${TONE[s.mention.sentiment]}`}>
            {s.text}
          </mark>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </>
  );
}
