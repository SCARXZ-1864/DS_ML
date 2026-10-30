import { arc, pie, type PieArcDatum } from "d3-shape";

const SLICE_COLOURS = [
  "var(--color-neg)",
  "color-mix(in srgb, var(--color-neg) 55%, var(--color-accent))",
  "var(--color-accent)",
  "color-mix(in srgb, var(--color-pos) 55%, var(--color-accent))",
  "var(--color-pos)",
];

type Props = { starMix: number[] | null; avgStars: number | null };

export function StarDonut({ starMix, avgStars }: Props) {
  const total = starMix?.reduce((a, b) => a + b, 0) ?? 0;
  if (!starMix || avgStars === null || total === 0) {
    return <p className="text-sm text-muted">No star ratings in this data.</p>;
  }
  const slices = pie<number>().sort(null).value((d) => d)(starMix);
  const shape = arc<PieArcDatum<number>>().innerRadius(52).outerRadius(80).padAngle(0.012);
  const label =
    "Star ratings: " +
    starMix.map((c, i) => `${i + 1} star${i ? "s" : ""} ${Math.round((c / total) * 100)}%`).join(", ") +
    `. Average ${avgStars.toFixed(2)}.`;

  return (
    <svg viewBox="-100 -100 200 200" className="h-44 w-44" role="img" aria-label={label}>
      {slices.map((s, i) => (
        <path key={i} d={shape(s) ?? ""} style={{ fill: SLICE_COLOURS[i] }} className="stroke-bg" strokeWidth={2} />
      ))}
      <text textAnchor="middle" y={6} fontSize={26} className="fill-ink font-serif">{avgStars.toFixed(1)}</text>
      <text textAnchor="middle" y={24} fontSize={10} className="fill-muted">avg stars</text>
    </svg>
  );
}
