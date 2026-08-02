import Skeleton from "@/components/Skeleton";

/** Esqueleto de la página de añadir libro. */
export default function LoadingAdd() {
  return (
    <div className="px-4 py-8 md:px-10 md:py-10" aria-busy aria-label="Cargando">
      <div className="mx-auto max-w-[900px] space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-5 w-64" />
      </div>
    </div>
  );
}
