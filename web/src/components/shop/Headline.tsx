import { Fragment } from "react";
import type { Headline as HeadlineData } from "@/lib/data/schemas";

const TONE_CLASS = {
  negative: "bg-neg/15 px-1 text-neg",
  positive: "text-pos",
  neutral: "text-accent",
} as const;

type Props = { headline: HeadlineData; as?: "p" | "h2"; className?: string };

/** Renders structured parts as text. Never HTML, so data can't inject markup. */
export function Headline({ headline, as: Tag = "p", className = "" }: Props) {
  return (
    <Tag className={`font-serif text-2xl leading-snug text-ink ${className}`}>
      {headline.parts.map((part, i) =>
        part.tone ? (
          <em key={i} data-tone={part.tone} className={`not-italic ${TONE_CLASS[part.tone]}`}>
            {part.text}
          </em>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </Tag>
  );
}
