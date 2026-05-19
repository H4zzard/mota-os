export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 space-y-6 animate-pulse max-w-screen-2xl mx-auto w-full">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-52 rounded-lg" style={{ background: "var(--bg-tertiary)" }} />
            <div className="h-4 w-72 rounded-lg" style={{ background: "var(--bg-tertiary)" }} />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-28 rounded-xl" style={{ background: "var(--bg-card)" }} />
            ))}
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }} />
          ))}
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 h-72 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }} />
          <div className="h-72 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }} />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 h-64 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }} />
          <div className="h-64 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }} />
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }} />
          ))}
        </div>
      </div>
    </div>
  )
}
