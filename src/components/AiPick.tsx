import Link from "next/link";
import type { RecommendationRun } from "@/db/schema";
import BookCover from "./BookCover";
import Icon from "./Icon";

/** Tarjeta del dashboard: mejor recomendación IA cacheada, o CTA si no hay. */
export default function AiPick({ run }: { run: RecommendationRun | null }) {
  const top = run?.items?.[0];

  return (
    <section className="relative">
      <div className="absolute -top-3 left-4 z-10 flex items-center gap-2 bg-paper px-2 text-tertiary">
        <Icon name="auto_awesome" className="text-[16px]" />
        <span className="text-label-sm font-medium tracking-widest uppercase">
          Selección de la IA
        </span>
      </div>

      {top ? (
        <div className="vellum-card ai-glow relative flex flex-col items-center gap-6 overflow-hidden rounded-xl border-gold/30 p-6 md:flex-row md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-tertiary-fixed/5 to-transparent" />
          <div className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-xs shadow-md md:w-44">
            <BookCover src={top.coverUrl} title={top.title} />
          </div>
          <div className="relative z-10 flex-1 space-y-3 text-center md:text-left">
            <div className="flex items-center justify-center gap-2 text-tertiary-container md:justify-start">
              <Icon name="auto_awesome" filled className="text-[16px]" />
              <span className="text-label-sm font-medium tracking-wider uppercase">
                Afinidad {top.affinity}%
              </span>
            </div>
            <h2 className="font-display text-headline-sm font-semibold text-on-surface">
              {top.title}
            </h2>
            <p className="text-label-md font-semibold tracking-wider text-on-surface-variant italic">
              de {top.author}
            </p>
            <p className="mx-auto line-clamp-3 max-w-2xl text-on-surface-variant md:mx-0">
              {top.reason}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3 md:justify-start">
              <Link
                href="/recommendations"
                className="inline-flex items-center gap-2 rounded-sm bg-primary-container px-6 py-2 text-label-md font-semibold tracking-wider text-on-primary transition-colors hover:bg-primary-container/90"
              >
                <Icon name="auto_awesome" className="text-[18px]" />
                Ver recomendaciones
              </Link>
              {!top.owned && (
                <a
                  href={top.buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-sm border border-tertiary-container/60 px-6 py-2 text-label-md font-semibold tracking-wider text-tertiary transition-colors hover:bg-tertiary-container/10"
                >
                  <Icon name="shopping_cart" className="text-[18px]" />
                  Comprar
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="vellum-card ai-glow relative flex flex-col items-center gap-4 overflow-hidden rounded-xl border-gold/30 p-8 text-center md:flex-row md:text-left">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-tertiary-fixed/5 to-transparent" />
          <Icon
            name="auto_awesome"
            filled
            className="relative z-10 text-[40px] text-tertiary-container"
          />
          <div className="relative z-10 flex-1">
            <h2 className="font-display text-headline-sm font-semibold text-on-surface">
              ¿Sin ideas para tu próxima lectura?
            </h2>
            <p className="mt-1 text-on-surface-variant">
              Deja que la IA analice tu biblioteca y te proponga libros a tu
              medida, dentro y fuera de tu colección.
            </p>
          </div>
          <Link
            href="/recommendations"
            className="relative z-10 inline-flex shrink-0 items-center gap-2 rounded-sm bg-primary-container px-6 py-2 text-label-md font-semibold tracking-wider text-on-primary transition-opacity hover:opacity-90"
          >
            <Icon name="auto_awesome" className="text-[18px]" />
            Probar el recomendador
          </Link>
        </div>
      )}
    </section>
  );
}
