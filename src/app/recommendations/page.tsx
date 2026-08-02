import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import {
  getRecommendationRun,
  listLibraryForPrompt,
  listRecommendationRuns,
  UUID_REGEX,
} from "@/lib/queries";
import GenerateRecommendations from "@/components/GenerateRecommendations";
import RecommendationCard from "@/components/RecommendationCard";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "Recomendador IA",
};

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const requestedRun =
    typeof params.run === "string" && UUID_REGEX.test(params.run)
      ? params.run
      : null;

  const [runs, library] = await Promise.all([
    listRecommendationRuns(user.id),
    listLibraryForPrompt(user.id),
  ]);

  // Por defecto la última generación; ?run= permite revisar las anteriores.
  const run = requestedRun
    ? ((await getRecommendationRun(user.id, requestedRun)) ?? runs[0] ?? null)
    : (runs[0] ?? null);
  const isLatest = run?.id === runs[0]?.id;

  const visibleItems = run
    ? run.items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.dismissed)
    : [];
  const dismissedCount = run ? run.items.length - visibleItems.length : 0;

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
          hasRun={runs.length > 0}
        />

        {run && run.items.length > 0 ? (
          <section className="mt-12">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-label-md font-semibold tracking-wider text-on-surface-variant">
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
                {run.model && (
                  <span className="rounded-full border border-outline-variant px-2 py-0.5 text-label-sm font-medium">
                    {run.model}
                  </span>
                )}
                {!isLatest && (
                  <span className="rounded-full bg-outline-variant/40 px-2 py-0.5 text-label-sm font-medium">
                    generación antigua
                  </span>
                )}
              </p>

              {runs.length > 1 && (
                <details className="relative">
                  <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full border border-outline-variant px-3 py-1 text-label-md font-semibold tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container-high [&::-webkit-details-marker]:hidden">
                    <Icon name="history" className="text-[16px]" />
                    Anteriores ({runs.length})
                  </summary>
                  <ul className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-outline-variant/40 bg-surface p-2 shadow-lg">
                    {runs.map((entry) => (
                      <li key={entry.id}>
                        <Link
                          href={
                            entry.id === runs[0].id
                              ? "/recommendations"
                              : `/recommendations?run=${entry.id}`
                          }
                          className={`block rounded-sm px-3 py-2 text-sm transition-colors hover:bg-surface-container-high ${
                            entry.id === run.id
                              ? "font-semibold text-primary"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {entry.createdAt.toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          ·{" "}
                          {entry.createdAt.toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {entry.id === runs[0].id && " (última)"}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            {visibleItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                {visibleItems.map(({ item, index }, position) => (
                  <RecommendationCard
                    key={`${run.id}-${index}`}
                    item={item}
                    runId={run.id}
                    index={index}
                    featured={position === 0}
                  />
                ))}
              </div>
            ) : (
              <div className="vellum-card flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center">
                <Icon name="block" className="text-[36px] text-outline" />
                <p className="text-on-surface-variant">
                  Has descartado todas las recomendaciones de esta generación.
                  Genera unas nuevas cuando quieras.
                </p>
              </div>
            )}

            {dismissedCount > 0 && visibleItems.length > 0 && (
              <p className="mt-6 text-label-md text-on-surface-variant">
                {dismissedCount}{" "}
                {dismissedCount === 1
                  ? "recomendación descartada"
                  : "recomendaciones descartadas"}{" "}
                — no volverán a proponerse.
              </p>
            )}
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
