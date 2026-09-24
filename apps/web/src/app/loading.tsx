export default function Loading() {
  return (
    <div className="container py-12 md:py-16">
      {/* Header Skeleton */}
      <div className="max-w-md space-y-3 mb-10">
        <div className="h-4 w-28 rounded-full bg-foreground/[0.06] animate-pulse" />
        <div className="h-10 w-64 rounded-xl bg-foreground/[0.08] animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid-products">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.6rem] bg-foreground/[0.06] animate-pulse">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <div className="space-y-2 pt-2 px-1">
              <div className="h-3 w-20 rounded-full bg-foreground/[0.05] animate-pulse" />
              <div className="h-4 w-3/4 rounded-md bg-foreground/[0.08] animate-pulse" />
              <div className="h-4 w-1/3 rounded-md bg-foreground/[0.06] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
