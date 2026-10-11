/** Shown the instant a tab is tapped, until that screen's data arrives. */
export default function Loading() {
  return (
    <div className="page flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-40 rounded-md bg-tint" />
      <div className="h-12 rounded-pill bg-tint" />
      <div className="card h-28" />
      <div className="card h-48" />
    </div>
  );
}
