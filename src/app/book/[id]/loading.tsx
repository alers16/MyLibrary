import Skeleton from "@/components/Skeleton";

/** Esqueleto de la ficha del libro. */
export default function LoadingBook() {
  return (
    <div className="px-4 py-8 md:px-10 md:py-10" aria-busy aria-label="Cargando el libro">
      <div className="mx-auto max-w-[1000px]">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Skeleton className="mx-auto aspect-[2/3] w-56 rounded-xs md:w-full" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
          <div className="md:col-span-8 space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-4 h-72 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
