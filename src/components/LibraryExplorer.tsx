"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  PAGE_SIZE,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  type Book,
} from "@/lib/books";
import BookCard from "./BookCard";
import Icon from "./Icon";

type Props = {
  books: Book[];
  genres: string[];
  total: number;
  aiSlot?: ReactNode;
};

export default function LibraryExplorer({
  books,
  genres,
  total,
  aiSlot,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("estado") ?? "";
  const currentGenre = searchParams.get("genero") ?? "";
  const currentSort = searchParams.get("orden") ?? "recent";
  const favoritesOnly = searchParams.get("fav") === "1";
  const urlQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(urlQuery);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "limit") params.delete("limit");
    router.replace(params.size > 0 ? `${pathname}?${params}` : pathname, {
      scroll: false,
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
    !!currentStatus || !!currentGenre || favoritesOnly || !!urlQuery;

  const showingAll = books.length >= total;

  return (
    <div className="space-y-16">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Icon
                name="search"
                className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por título o autor…"
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
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-label-md font-semibold tracking-wider transition-colors ${
                favoritesOnly
                  ? "border-tertiary-container bg-tertiary-container/20 text-tertiary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <Icon
                name="star"
                filled={favoritesOnly}
                className="text-[16px]"
              />
              Favoritos
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
              Todos
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
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {aiSlot}

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-headline-sm font-semibold text-on-surface">
            {hasActiveFilters ? "Resultados" : "Últimas incorporaciones"}
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
        ) : (
          <>
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

            {!showingAll && (
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
          </>
        )}
      </section>
    </div>
  );
}
