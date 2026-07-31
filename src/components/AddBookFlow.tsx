"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { addBook, type AddBookInput } from "@/app/actions/books";
import { STATUS_OPTIONS, type ReadingStatus } from "@/lib/books";
import type { CatalogBook } from "@/lib/google-books";
import BookCover from "./BookCover";
import Icon from "./Icon";

const LABEL =
  "mb-1 block text-label-md font-semibold tracking-wider text-on-surface-variant";
const INPUT = "input-minimal w-full py-2 text-on-surface";

type FormState = {
  googleId: string | null;
  title: string;
  authors: string;
  genres: string;
  synopsis: string;
  coverUrl: string;
  publishedYear: string;
  pageCount: string;
  isbn13: string;
  language: string;
  status: ReadingStatus;
  notes: string;
};

const EMPTY_FORM: FormState = {
  googleId: null,
  title: "",
  authors: "",
  genres: "",
  synopsis: "",
  coverUrl: "",
  publishedYear: "",
  pageCount: "",
  isbn13: "",
  language: "",
  status: "to_read",
  notes: "",
};

function catalogToForm(book: CatalogBook): FormState {
  return {
    googleId: book.googleId,
    title: book.title,
    authors: book.authors.join(", "),
    genres: book.genres.join(", "),
    synopsis: book.synopsis ?? "",
    coverUrl: book.coverUrl ?? "",
    publishedYear: book.publishedYear?.toString() ?? "",
    pageCount: book.pageCount?.toString() ?? "",
    isbn13: book.isbn13 ?? "",
    language: book.language ?? "",
    status: "to_read",
    notes: "",
  };
}

export default function AddBookFlow() {
  const [query, setQuery] = useState("");
  const [allLanguages, setAllLanguages] = useState(false);
  const [results, setResults] = useState<CatalogBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedTitle, setSavedTitle] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(trimmed)}${allLanguages ? "&all=1" : ""}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "error");
        setResults(data.results ?? []);
        setSearchError(null);
        setSearching(false);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setResults([]);
        setSearchError("No se pudo consultar el catálogo. Inténtalo de nuevo.");
        setSearching(false);
      }
    }, 400);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query, allLanguages]);

  function selectResult(book: CatalogBook) {
    setForm(catalogToForm(book));
    setSavedTitle(null);
    setSaveError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // La búsqueda a veces recorta la sinopsis: pedimos la ficha completa.
    fetch(`/api/books/search?id=${encodeURIComponent(book.googleId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const full: CatalogBook | null = data?.book ?? null;
        if (!full) return;
        setForm((prev) =>
          prev && prev.googleId === full.googleId
            ? {
                ...prev,
                synopsis: full.synopsis ?? prev.synopsis,
                genres:
                  full.genres.length > 0 ? full.genres.join(", ") : prev.genres,
                pageCount: full.pageCount?.toString() ?? prev.pageCount,
                coverUrl: prev.coverUrl || (full.coverUrl ?? ""),
              }
            : prev,
        );
      })
      .catch(() => undefined);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function submit() {
    if (!form || saving) return;
    setSaveError(null);

    const year = Number(form.publishedYear);
    const pages = Number(form.pageCount);
    const input: AddBookInput = {
      googleId: form.googleId || undefined,
      title: form.title,
      authors: form.authors
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      genres: form.genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
      synopsis: form.synopsis || undefined,
      coverUrl: form.coverUrl.trim() || undefined,
      publishedYear:
        form.publishedYear && Number.isFinite(year) ? year : undefined,
      pageCount: form.pageCount && Number.isFinite(pages) ? pages : undefined,
      language: form.language || undefined,
      isbn13: form.isbn13.replace(/[^0-9]/g, "") || undefined,
      status: form.status,
      notes: form.notes || undefined,
    };

    startSaving(async () => {
      const result = await addBook(input);
      if (result.ok) {
        setSavedTitle(form.title);
        setForm(null);
        setQuery("");
        setResults([]);
      } else {
        setSaveError(result.error);
      }
    });
  }

  /* ── Confirmación ──────────────────────────────────────────────── */
  if (savedTitle) {
    return (
      <div className="vellum-card rounded-xl p-8 text-center md:p-10">
        <Icon
          name="check_circle"
          filled
          className="text-[48px] text-primary"
        />
        <h2 className="mt-4 font-display text-headline-sm font-semibold text-on-surface">
          «{savedTitle}» ya está en tu biblioteca
        </h2>
        <p className="mt-2 text-on-surface-variant">
          ¿Quieres seguir catalogando o volver a tus estanterías?
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => setSavedTitle(null)}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary-container px-8 py-2 text-label-md font-semibold tracking-wider text-on-primary transition-opacity hover:opacity-90 sm:w-auto"
          >
            <Icon name="add" className="text-[18px]" />
            Añadir otro libro
          </button>
          <Link
            href="/"
            className="w-full rounded-sm border border-outline-variant/50 px-6 py-2 text-center text-label-md font-semibold tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container-high sm:w-auto"
          >
            Ver mi biblioteca
          </Link>
        </div>
      </div>
    );
  }

  /* ── Formulario (resultado seleccionado o entrada manual) ──────── */
  if (form) {
    return (
      <div className="vellum-card relative overflow-hidden rounded-xl p-6 shadow-sm md:p-10">
        <div className="pointer-events-none absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-bl-full bg-primary-fixed/20 blur-2xl" />

        <button
          type="button"
          onClick={() => setForm(null)}
          className="relative mb-6 flex items-center gap-1 text-label-md font-semibold tracking-wider text-primary hover:underline"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Volver a la búsqueda
        </button>

        {saveError && (
          <div className="relative mb-6 flex items-start gap-3 rounded-sm border border-error/30 bg-error-container/40 p-4">
            <Icon name="error" className="mt-0.5 text-error" />
            <p className="text-sm text-on-error-container">{saveError}</p>
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="relative"
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="flex flex-col md:col-span-4">
              <span className={LABEL}>Portada</span>
              <div className="vellum-card relative aspect-[2/3] w-full overflow-hidden rounded-sm">
                <BookCover src={form.coverUrl || null} title={form.title || "Sin título"} />
              </div>
              <label htmlFor="coverUrl" className={`${LABEL} mt-4`}>
                URL de la portada
              </label>
              <input
                id="coverUrl"
                type="text"
                value={form.coverUrl}
                onChange={(e) => set("coverUrl", e.target.value)}
                placeholder="https://…"
                className={`${INPUT} text-sm`}
              />
            </div>

            <div className="flex flex-col gap-6 md:col-span-8">
              <div>
                <label htmlFor="title" className={LABEL}>
                  Título *
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="p. ej. La sombra del viento"
                  className={`${INPUT} font-display text-headline-sm font-semibold placeholder:font-body placeholder:text-body-md placeholder:text-outline-variant/70`}
                />
              </div>
              <div>
                <label htmlFor="authors" className={LABEL}>
                  Autores * (separados por comas)
                </label>
                <input
                  id="authors"
                  type="text"
                  required
                  value={form.authors}
                  onChange={(e) => set("authors", e.target.value)}
                  placeholder="p. ej. Carlos Ruiz Zafón"
                  className={`${INPUT} text-body-lg placeholder:text-outline-variant`}
                />
              </div>
              <div>
                <label htmlFor="genres" className={LABEL}>
                  Géneros (separados por comas)
                </label>
                <input
                  id="genres"
                  type="text"
                  value={form.genres}
                  onChange={(e) => set("genres", e.target.value)}
                  placeholder="p. ej. Novela, Misterio"
                  className={`${INPUT} placeholder:text-outline-variant`}
                />
              </div>
              <div>
                <label htmlFor="synopsis" className={LABEL}>
                  Sinopsis
                </label>
                <textarea
                  id="synopsis"
                  rows={5}
                  value={form.synopsis}
                  onChange={(e) => set("synopsis", e.target.value)}
                  placeholder="Resumen del libro…"
                  className={`${INPUT} resize-y placeholder:text-outline-variant`}
                />
              </div>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div>
                  <label htmlFor="publishedYear" className={LABEL}>
                    Año
                  </label>
                  <input
                    id="publishedYear"
                    type="number"
                    value={form.publishedYear}
                    onChange={(e) => set("publishedYear", e.target.value)}
                    placeholder="2001"
                    className={`${INPUT} placeholder:text-outline-variant`}
                  />
                </div>
                <div>
                  <label htmlFor="pageCount" className={LABEL}>
                    Páginas
                  </label>
                  <input
                    id="pageCount"
                    type="number"
                    value={form.pageCount}
                    onChange={(e) => set("pageCount", e.target.value)}
                    placeholder="576"
                    className={`${INPUT} placeholder:text-outline-variant`}
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor="isbn13" className={LABEL}>
                    ISBN
                  </label>
                  <input
                    id="isbn13"
                    type="text"
                    value={form.isbn13}
                    onChange={(e) => set("isbn13", e.target.value)}
                    placeholder="9788408043645"
                    className={`${INPUT} font-mono placeholder:text-outline-variant`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="status" className={LABEL}>
                    Estado de lectura
                  </label>
                  <div className="relative">
                    <select
                      id="status"
                      value={form.status}
                      onChange={(e) =>
                        set("status", e.target.value as ReadingStatus)
                      }
                      className={`${INPUT} cursor-pointer appearance-none bg-transparent pr-8`}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-on-surface-variant">
                      <Icon name="expand_more" className="text-sm" />
                    </span>
                  </div>
                </div>
                <div>
                  <label htmlFor="notes" className={LABEL}>
                    Notas personales
                  </label>
                  <input
                    id="notes"
                    type="text"
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="p. ej. edición firmada, regalo…"
                    className={`${INPUT} placeholder:text-outline-variant`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-end gap-4 border-t border-outline-variant/30 pt-6 sm:flex-row">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="w-full rounded-sm border border-outline-variant/50 px-6 py-2 text-center text-label-md font-semibold tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container-high sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary-container px-8 py-2 text-label-md font-semibold tracking-wider text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              <Icon name="save" className="text-sm" />
              {saving ? "Guardando…" : "Guardar en mi biblioteca"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ── Búsqueda en el catálogo ───────────────────────────────────── */
  return (
    <div className="space-y-8">
      <div className="vellum-card rounded-xl p-6 md:p-8">
        <label htmlFor="catalog-search" className={LABEL}>
          Busca en el catálogo (Google Books)
        </label>
        <div className="relative">
          <Icon
            name="search"
            className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            id="catalog-search"
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Título, autor o ISBN…"
            className="input-minimal w-full py-3 pl-10 font-display text-headline-sm font-semibold text-on-surface placeholder:font-body placeholder:text-body-md placeholder:text-outline-variant/70"
          />
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={allLanguages}
            onChange={(event) => setAllLanguages(event.target.checked)}
            className="h-4 w-4 accent-primary-container"
          />
          Buscar en todos los idiomas (por defecto se priorizan ediciones en
          español)
        </label>
      </div>

      {searching && (
        <p className="flex items-center gap-2 text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin text-[20px]" />
          Buscando en el catálogo…
        </p>
      )}

      {searchError && (
        <div className="flex items-start gap-3 rounded-sm border border-error/30 bg-error-container/40 p-4">
          <Icon name="error" className="mt-0.5 text-error" />
          <p className="text-sm text-on-error-container">{searchError}</p>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((book) => (
            <button
              key={book.googleId}
              type="button"
              onClick={() => selectResult(book)}
              className="group block text-left"
            >
              <div className="vellum-card book-shadow relative mb-3 aspect-[2/3] overflow-hidden rounded-xs">
                <BookCover src={book.coverUrl} title={book.title} />
                <span className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1 bg-primary-container/90 py-1.5 text-label-sm font-semibold tracking-wider text-on-primary uppercase opacity-0 transition-opacity group-hover:opacity-100">
                  <Icon name="add" className="text-[14px]" />
                  Seleccionar
                </span>
              </div>
              <h3 className="line-clamp-2 font-display text-[16px] leading-snug font-semibold text-on-surface transition-colors group-hover:text-primary">
                {book.title}
              </h3>
              <p className="line-clamp-1 text-label-sm font-medium text-on-surface-variant">
                {book.authors.join(", ") || "Autor desconocido"}
                {book.publishedYear ? ` · ${book.publishedYear}` : ""}
              </p>
            </button>
          ))}
        </div>
      )}

      {!searching &&
        query.trim().length >= 2 &&
        results.length === 0 &&
        !searchError && (
          <p className="text-on-surface-variant">
            Sin resultados para «{query.trim()}».{" "}
            {!allLanguages && "Prueba a buscar en todos los idiomas o "}
            añádelo manualmente.
          </p>
        )}

      <div className="border-t border-outline-variant/20 pt-6 text-center">
        <button
          type="button"
          onClick={() => {
            setForm({ ...EMPTY_FORM });
            setSaveError(null);
          }}
          className="inline-flex items-center gap-2 text-label-md font-semibold tracking-wider text-primary hover:underline"
        >
          <Icon name="edit_note" className="text-[20px]" />
          ¿No lo encuentras? Añádelo manualmente
        </button>
      </div>
    </div>
  );
}
