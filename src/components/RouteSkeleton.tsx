export function RouteSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded bg-muted" />
            ))}
          </div>
          <div className="h-80 rounded bg-muted" />
          <div className="h-64 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
