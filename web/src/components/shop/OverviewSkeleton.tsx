/** Same layout as the overview, as shimmering placeholders, so nothing jumps when data arrives. */
export function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading overview" className="pt-6">
      <div className="skeleton h-3 w-56" />
      <div className="skeleton mt-3 h-8 w-80" />
      <div className="skeleton mt-6 h-7 w-full max-w-3xl" />
      <div className="mt-5 grid grid-cols-2 gap-px md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
      <div className="skeleton mt-8 h-48 w-full" />
    </div>
  );
}
