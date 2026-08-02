import Skeleton from "@/components/Skeleton";

/** Esqueleto del recomendador. */
export default function LoadingRecommendations() {
  return (
    <div className="px-4 py-8 md:px-10 md:py-12" aria-busy aria-label="Cargando recomendaciones">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-10 space-y-3">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-2/3 max-w-xl" />
        </header>

        <Skeleton className="h-12 w-64" />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-12">
          <Skeleton className="h-80 rounded-xl md:col-span-8" />
          <Skeleton className="h-80 rounded-xl md:col-span-4" />
          <Skeleton className="h-72 rounded-xl md:col-span-4" />
          <Skeleton className="h-72 rounded-xl md:col-span-4" />
          <Skeleton className="h-72 rounded-xl md:col-span-4" />
        </div>
      </div>
    </div>
  );
}
