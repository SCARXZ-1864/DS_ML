import type { Change } from "@/lib/data/schemas";

// Direction is shown by a symbol and a word as well as colour, so it never relies on colour alone.
const KIND: Record<Change["kind"], { mark: string; word: string; className: string }> = {
  rise: { mark: "▲", word: "More complaints", className: "border-neg text-neg" },
  fall: { mark: "▼", word: "Fewer complaints", className: "border-pos text-pos" },
  new_aspect: { mark: "+", word: "New topic", className: "border-info text-info" },
};

/** What this upload changed, compared with the reviews the shop already had. */
export function ChangeCards({ changes }: { changes: Change[] }) {
  if (changes.length === 0) {
    return <p className="text-muted">No big changes compared with the reviews you already had.</p>;
  }
  return (
    <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
      {changes.map((c) => {
        const k = KIND[c.kind];
        return (
          <li key={`${c.kind}-${c.aspectId}`} className={`animate-fade-rise border-l-2 bg-panel px-4 py-3 ${k.className}`}>
            <p className="label">
              <span aria-hidden>{k.mark} </span>
              {k.word}
            </p>
            <p className="mt-1 text-ink">{c.note}</p>
          </li>
        );
      })}
    </ul>
  );
}
