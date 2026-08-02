import Skeleton from "@/components/Skeleton";

/** Esqueleto de la página de estadísticas. */
export default function LoadingStats() {
  return (
    <div className="px-4 py-8 md:px-10 md:py-10" aria-busy aria-label="Cargando estadísticas">
      <div className="mx-auto max-w-[1100px] space-y-8">
        <header className="space-y-2 border-b border-outline-variant/20 pb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </header>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
