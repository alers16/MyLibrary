import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import {
  getLatestRecommendationRun,
  listLibraryForPrompt,
} from "@/lib/queries";
import GenerateRecommendations from "@/components/GenerateRecommendations";
import RecommendationCard from "@/components/RecommendationCard";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "Recomendador IA",
};

export default async function RecommendationsPage() {
  const user = await requireUser();
  const [run, library] = await Promise.all([
    getLatestRecommendationRun(user.id),
    listLibraryForPrompt(user.id),
  ]);

  const aiConfigured = Boolean(process.env.OPENAI_API_KEY);

  return (
    <div className="px-4 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-10">
          <h1 className="flex items-center gap-3 font-display text-display-lg-mobile font-bold text-primary md:text-display-lg">
            Seleccionado para ti
            <Icon
              name="auto_awesome"
              filled
              className="animate-pulse text-tertiary-container"
            />
          </h1>
          <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
            La IA analiza tu biblioteca —géneros, autores, valoraciones y
            favoritos— y te propone lecturas a tu medida. Si ya tienes el
            libro, te lo señala; si no, te dice dónde comprarlo.
          </p>
        </header>

        <GenerateRecommendations
          bookCount={library.length}
          aiConfigured={aiConfigured}
          hasRun={Boolean(run)}
        />

        {run && run.items.length > 0 ? (
          <section className="mt-12">
            <p className="mb-6 flex items-center gap-2 text-label-md font-semibold tracking-wider text-on-surface-variant">
              <Icon name="history" className="text-[18px]" />
              Generado el{" "}
              {run.createdAt.toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              a las{" "}
              {run.createdAt.toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              {run.items.map((item, index) => (
                <RecommendationCard
                  key={`${run.id}-${index}`}
                  item={item}
                  runId={run.id}
                  index={index}
                  featured={index === 0}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-12">
            <div className="vellum-card ai-glow flex flex-col items-center gap-3 rounded-xl border-gold/30 px-6 py-16 text-center">
              <Icon
                name="auto_awesome"
                filled
                className="text-[48px] text-tertiary-container"
              />
              <p className="font-display text-headline-sm font-semibold text-on-surface">
                Aún no hay recomendaciones
              </p>
              <p className="max-w-md text-on-surface-variant">
                Pulsa «Generar recomendaciones» y la IA estudiará tu
                biblioteca para proponerte tus próximas lecturas.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
