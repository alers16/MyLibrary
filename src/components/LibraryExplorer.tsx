"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LANGUAGE_LABELS,
  PAGE_SIZE,
  SORT_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  type Book,
  type ReadingStatus,
} from "@/lib/books";
import BookCard from "./BookCard";
import Icon from "./Icon";
import UndoDeleteToast from "./UndoDeleteToast";

type Props = {
  books: Book[];
  genres: string[];
  languages: string[];
  statusCounts: Record<ReadingStatus | "all", number>;
  total: number;
  aiSlot?: ReactNode;
};

export default function LibraryExplorer({
  books,
  genres,
  languages,
  statusCounts,
  total,
  aiSlot,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("estado") ?? "";
  const currentGenre = searchParams.get("genero") ?? "";
  const currentSort = searchParams.get("orden") ?? "recent";
  const currentRating = searchParams.get("nota") ?? "";
  const currentLanguage = searchParams.get("idioma") ?? "";
  const favoritesOnly = searchParams.get("fav") === "1";
  const noCoverOnly = searchParams.get("sinportada") === "1";
  const listView = searchParams.get("vista") === "lista";
  const urlQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(urlQuery);
  // Cambiar filtros no cambia de ruta, así que loading.tsx no aplica:
  // la transición atenúa los resultados mientras llega la consulta nueva.
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "limit") params.delete("limit");
    startTransition(() => {
      router.replace(params.size > 0 ? `${pathname}?${params}` : pathname, {
        scroll: false,
      });
    });
  }

  // El buscador escribe en la URL con un pequeño debounce
  useEffect(() => {
    const handle = setTimeout(() => {
      if (query.trim() === urlQuery) return;
      setParam("q", query.trim() || null);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasActiveFilters =
    !!currentStatus ||
    !!currentGenre ||
    !!currentRating ||
    !!currentLanguage ||
    favoritesOnly ||
    noCoverOnly ||
    !!urlQuery;

  const showingAll = books.length >= total;

  const detailHref = (book: Book) => {
    const qs = searchParams.toString();
    return qs ? `/book/${book.id}?${qs}` : `/book/${book.id}`;
  };

  const chip = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-label-md font-semibold tracking-wider transition-colors ${
      active
        ? "border-tertiary-container bg-tertiary-container/20 text-tertiary"
        : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
    }`;

  return (
    <div className="space-y-16">
      <UndoDeleteToast />

      <header className="flex flex-col justify-between gap-6 border-b border-outline-variant/20 pb-6 xl:flex-row xl:items-end">
        <div className="space-y-1">
          <h1 className="font-display text-headline-md font-semibold text-on-surface">
            Mi biblioteca
          </h1>
          <p className="text-on-surface-variant">
            Explora y organiza tu colección digital.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 xl:w-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:w-64">
              <Icon
                name="search"
                className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Título, autor, sinopsis o notas…"
                className="input-minimal w-full py-2 pl-10 text-on-surface transition-colors placeholder:text-on-surface-variant/50"
              />
            </div>

            <select
              value={currentGenre}
              onChange={(event) => setParam("genero", event.target.value || null)}
              className="input-minimal cursor-pointer bg-transparent py-2 pr-6 text-sm text-on-surface"
            >
              <option value="">Todos los géneros</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>

            <select
              value={currentRating}
              onChange={(event) => setParam("nota", event.target.value || null)}
              className="input-minimal cursor-pointer bg-transparent py-2 pr-6 text-sm text-on-surface"
            >
              <option value="">Cualquier nota</option>
              <option value="5">5 estrellas</option>
              <option value="4">4★ o más</option>
              <option value="3">3★ o más</option>
            </select>

            {languages.length > 1 && (
              <select
                value={currentLanguage}
                onChange={(event) =>
                  setParam("idioma", event.target.value || null)
                }
                className="input-minimal cursor-pointer bg-transparent py-2 pr-6 text-sm text-on-surface"
              >
                <option value="">Todos los idiomas</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang] ?? lang.toUpperCase()}
                  </option>
                ))}
              </select>
            )}

            <select
              value={currentSort}
              onChange={(event) =>
                setParam(
                  "orden",
                  event.target.value === "recent" ? null : event.target.value,
                )
              }
              className="input-minimal cursor-pointer bg-transparent py-2 pr-6 text-sm text-on-surface"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setParam("fav", favoritesOnly ? null : "1")}
              aria-pressed={favoritesOnly}
              className={chip(favoritesOnly)}
            >
              <Icon name="star" filled={favoritesOnly} className="text-[16px]" />
              Favoritos
            </button>

            <button
              type="button"
              onClick={() => setParam("sinportada", noCoverOnly ? null : "1")}
              aria-pressed={noCoverOnly}
              title="Libros a los que les falta la portada"
              className={chip(noCoverOnly)}
            >
              <Icon name="image_not_supported" className="text-[16px]" />
              Sin portada
            </button>
          </div>

          <div className="hide-scrollbar flex w-full gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setParam("estado", null)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-label-md font-semibold tracking-wider transition-colors ${
                currentStatus === ""
                  ? "border-primary-container bg-primary-container text-on-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Todos ({statusCounts.all})
            </button>
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setParam("estado", option.value)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-label-md font-semibold tracking-wider transition-colors ${
                  currentStatus === option.value
                    ? "border-primary-container bg-primary-container text-on-primary"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {option.label} ({statusCounts[option.value]})
              </button>
            ))}
          </div>
        </div>
      </header>

      {aiSlot}

      <section
        aria-busy={isPending}
        className={`transition-opacity duration-200 ${isPending ? "pointer-events-none opacity-50" : ""}`}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-headline-sm font-semibold text-on-surface">
            {hasActiveFilters ? "Resultados" : "Últimas incorporaciones"}
            {isPending && (
              <Icon
                name="progress_activity"
                className="animate-spin text-[18px] text-on-surface-variant"
              />
            )}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-label-md font-semibold tracking-wider text-on-surface-variant">
              {showingAll
                ? `${total} ${total === 1 ? "libro" : "libros"}`
                : `${books.length} de ${total} libros`}
            </span>
            {total > PAGE_SIZE && (
              <button
                type="button"
                onClick={() =>
                  setParam("limit", showingAll ? null : String(total))
                }
                className="rounded-full border border-outline-variant px-3 py-1 text-label-md font-semibold tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
              >
                {showingAll ? "Ver menos" : "Ver más"}
              </button>
            )}
            <div
              className="flex overflow-hidden rounded-full border border-outline-variant"
              role="group"
              aria-label="Tipo de vista"
            >
              <button
                type="button"
                onClick={() => setParam("vista", null)}
                aria-pressed={!listView}
                title="Vista de portadas"
                className={`flex items-center justify-center px-2.5 py-1.5 transition-colors ${
                  !listView
                    ? "bg-primary-container text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <Icon name="grid_view" className="block text-[16px] leading-none" />
              </button>
              <button
                type="button"
                onClick={() => setParam("vista", "lista")}
                aria-pressed={listView}
                title="Vista de lista"
                className={`flex items-center justify-center px-2.5 py-1.5 transition-colors ${
                  listView
                    ? "bg-primary-container text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <Icon name="table_rows" className="block text-[16px] leading-none" />
              </button>
            </div>
          </div>
        </div>

        {books.length === 0 ? (
          <div className="vellum-card flex flex-col items-center gap-3 rounded-xl px-6 py-16 text-center">
            <Icon name="menu_book" className="text-[40px] text-outline" />
            {hasActiveFilters ? (
              <>
                <p className="font-display text-headline-sm font-semibold text-on-surface">
                  Ningún libro coincide
                </p>
                <p className="max-w-md text-on-surface-variant">
                  Prueba con otro título, autor, género o filtro.
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-headline-sm font-semibold text-on-surface">
                  Tu biblioteca está vacía
                </p>
                <p className="max-w-md text-on-surface-variant">
                  Empieza a catalogar tus libros: busca en el catálogo y
                  añádelos con un clic.
                </p>
                <Link
                  href="/add"
                  className="mt-2 inline-flex items-center gap-2 rounded-sm bg-primary-container px-6 py-2 text-label-md font-semibold tracking-wider text-on-primary transition-opacity hover:opacity-90"
                >
                  <Icon name="add" className="text-[18px]" />
                  Añadir mi primer libro
                </Link>
              </>
            )}
          </div>
        ) : listView ? (
          <div className="vellum-card overflow-x-auto rounded-xl">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-label-md font-semibold tracking-wider text-on-surface-variant">
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Autor</th>
                  <th className="px-4 py-3">Año</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Nota</th>
                  <th className="px-4 py-3" aria-label="Favorito" />
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr
                    key={book.id}
                    className="border-b border-outline-variant/15 last:border-b-0 hover:bg-surface-container-high/60"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={detailHref(book)}
                        className="font-display font-semibold text-on-surface hover:text-primary"
                      >
                        {book.title}
                      </Link>
                      {book.notes && (
                        <Icon
                          name="sticky_note_2"
                          className="ml-2 align-middle text-[14px] text-on-surface-variant"
                        />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-on-surface-variant">
                      {book.authors.join(", ") || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-on-surface-variant">
                      {book.publishedYear ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-on-surface-variant">
                      {STATUS_LABELS[book.status]}
                    </td>
                    <td className="px-4 py-2.5 text-on-surface-variant">
                      {book.rating ? `${book.rating}/5` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {book.favorite && (
                        <Icon
                          name="star"
                          filled
                          className="text-[16px] text-tertiary-container"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
            <Link href="/add" className="group flex flex-col gap-3">
              <div className="flex aspect-[2/3] items-center justify-center rounded-xs border-2 border-dashed border-outline-variant bg-vellum transition-colors group-hover:border-primary">
                <Icon
                  name="add"
                  className="text-[32px] text-outline-variant transition-colors group-hover:text-primary"
                />
              </div>
              <span className="font-display text-[18px] leading-snug font-semibold text-on-surface-variant transition-colors group-hover:text-primary">
                Añadir libro
              </span>
            </Link>
          </div>
        )}

        {books.length > 0 && !showingAll && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setParam("limit", String(total))}
              className="rounded-sm border border-outline-variant px-8 py-2 text-label-md font-semibold tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              Ver más ({total - books.length} restantes)
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
