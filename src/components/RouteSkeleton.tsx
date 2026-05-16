/**
 * Skeleton générique affiché par <Suspense> au niveau du shell pendant qu'une
 * route lazy se charge. Léger, identique en SSR/CSR, ne démonte ni Header ni
 * BottomDock.
 */
export function RouteSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-md px-4 py-6 space-y-4"
    >
      <div className="h-6 w-40 animate-pulse rounded-md bg-primary/10" />
      <div className="h-32 w-full animate-pulse rounded-2xl bg-primary/10" />
      <div className="space-y-3">
        <div className="h-14 w-full animate-pulse rounded-xl bg-primary/10" />
        <div className="h-14 w-full animate-pulse rounded-xl bg-primary/10" />
        <div className="h-14 w-full animate-pulse rounded-xl bg-primary/10" />
      </div>
    </main>
  );
}
