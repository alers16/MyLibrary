import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import AddBookFlow from "@/components/AddBookFlow";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "Añadir libro",
};

export default async function AddBookPage() {
  await requireUser();

  return (
    <div className="px-4 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-10 text-center">
          <h1 className="mb-2 font-display text-headline-sm font-semibold text-on-surface md:text-headline-md">
            Cataloga un nuevo volumen
          </h1>
          <p className="mx-auto max-w-lg text-on-surface-variant">
            Busca el libro en el catálogo y añádelo con un clic, o introdúcelo
            manualmente.
          </p>
        </div>

        <AddBookFlow />

        <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-sm border border-tertiary/20 bg-surface-container-lowest p-4">
          <Icon
            name="lightbulb"
            filled
            className="mt-0.5 text-tertiary-container"
          />
          <p className="text-sm text-on-surface-variant">
            <strong className="font-semibold text-on-surface">Consejo:</strong>{" "}
            cuantos más libros catalogues (con su género y tu valoración),
            mejores serán las sugerencias del{" "}
            <span className="text-tertiary-container">Recomendador IA</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
