/** Generic loading placeholder for shop pages: header, then a large content block. */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="pt-6">
      <div className="skeleton h-3 w-48" />
      <div className="skeleton mt-3 h-8 w-72" />
      <div className="skeleton mt-8 h-72 w-full" />
    </div>
  );
}
