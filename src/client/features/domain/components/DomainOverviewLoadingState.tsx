export function DomainOverviewLoadingState() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-base-300 bg-base-100 p-4 space-y-2"
          >
            <div className="skeleton h-3 w-28" />
            <div className="skeleton h-8 w-24" />
            <div className="skeleton h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-base-300 bg-base-100 p-4 space-y-3"
          >
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-44 w-full" />
          </div>
        ))}
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-3">
          <div className="flex items-center justify-between">
            <div className="skeleton h-8 w-48" />
            <div className="skeleton h-8 w-60" />
          </div>
          <div className="skeleton h-9 w-64" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="grid grid-cols-7 gap-3">
                <div className="skeleton h-4 col-span-2" />
                <div className="skeleton h-4" />
                <div className="skeleton h-4" />
                <div className="skeleton h-4" />
                <div className="skeleton h-4 col-span-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
