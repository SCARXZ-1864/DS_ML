import { AspectBars } from "@/components/charts/AspectBars";
import { Headline } from "@/components/shop/Headline";
import { ReviewCard } from "@/components/shop/ReviewCard";
import type { Report } from "@/lib/data/schemas";
import { fmtInt, fmtPct, fmtStars, shopTypeLabel } from "@/lib/format";
import { PERIOD_LABEL } from "./LinkList";
import { PrintButton } from "./PrintButton";

/** The shared, read-only report: light theme, laid out to print on A4. */
export function ReportView({ report }: { report: Report }) {
  const { shop, kpis } = report;
  const tiles = [
    { label: "Reviews", value: fmtInt(kpis.reviews), className: "" },
    { label: "Positive", value: fmtPct(kpis.positivePct), className: "text-pos" },
    { label: "Negative", value: fmtPct(kpis.negativePct), className: "text-neg" },
    { label: "Avg stars", value: fmtStars(kpis.avgStars), className: "" },
  ];
  const aspectNames = Object.fromEntries(report.aspects.map((a) => [a.id, a.name]));

  return (
    <article className="mx-auto grid max-w-4xl gap-8 px-6 py-10 print:px-0 print:py-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="label">{shopTypeLabel(shop.type)} · {PERIOD_LABEL[report.period]} · read-only report</p>
          <h1 className="mt-1 font-serif text-4xl">{shop.name}</h1>
        </div>
        <PrintButton />
      </header>

      {report.sections.includes("overview") && (
        <section className="grid gap-4" aria-label="Overview">
          <Headline headline={report.headline} as="h2" className="font-serif text-2xl" />
          <dl className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className="bg-panel p-4">
                <dt className="label">{t.label}</dt>
                <dd className={`m-0 mt-1 font-mono text-2xl ${t.className}`}>{t.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {report.aspects.length > 0 && (
        <section className="grid gap-3 break-inside-avoid" aria-labelledby="report-aspects">
          <h2 id="report-aspects" className="font-serif text-2xl">What customers rate this shop on</h2>
          <AspectBars rows={report.aspects.map((a) => ({ id: a.id, name: a.name, mentions: a.mentions, posPct: a.posPct, negPct: a.negPct }))} />
        </section>
      )}

      {report.quotes.length > 0 && (
        <section className="grid gap-3" aria-labelledby="report-quotes">
          <h2 id="report-quotes" className="font-serif text-2xl">In customers&apos; words</h2>
          <div className="grid gap-3">
            {report.quotes.map((r) => (
              <ReviewCard key={r.id} review={r} aspectNames={aspectNames} />
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-line pt-4 text-xs text-muted">Made with Review Intelligence. Figures come from the shop&apos;s customer reviews.</footer>
    </article>
  );
}
