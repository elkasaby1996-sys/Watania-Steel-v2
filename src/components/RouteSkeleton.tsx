export function RouteSkeleton() {
  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-[1500px] py-8">
        <div className="space-y-6">
          <div className="animate-pulse rounded-lg bg-white/[0.06] h-8 w-48" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="glass-panel rounded-2xl p-5">
                <div className="space-y-4 animate-pulse">
                  <div className="animate-pulse rounded-lg bg-white/[0.06] h-4 w-24" />
                  <div className="animate-pulse rounded-lg bg-white/[0.06] h-7 w-16" />
                </div>
              </div>
            ))}
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <div className="animate-pulse rounded-lg bg-white/[0.06] h-72" />
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <div className="animate-pulse rounded-lg bg-white/[0.06] h-56" />
          </div>
        </div>
      </div>
    </div>
  );
}
