import Skeleton from "@/components/Skeleton";

/** Esqueleto del dashboard mientras llegan los libros de la BD. */
export default function LoadingLibrary() {
  return (
    <div className="px-4 py-8 md:px-10 md:py-10" aria-busy aria-label="Cargando la biblioteca">
      <div className="mx-auto max-w-[1200px] space-y-16">
        <header className="flex flex-col justify-between gap-6 border-b border-outline-variant/20 pb-6 xl:flex-row xl:items-end">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          </div>
        </header>

        <Skeleton className="h-48 w-full rounded-xl" />

        <section>
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[2/3] w-full rounded-xs" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
