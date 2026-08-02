"use client";

import { useState, useTransition } from "react";
import { updateBookDetails, type BookDetailsInput } from "@/app/actions/books";
import type { Book } from "@/lib/books";
import BookCover from "./BookCover";
import Icon from "./Icon";

const LABEL =
  "mb-1 block text-label-md font-semibold tracking-wider text-on-surface-variant";
const INPUT = "input-minimal w-full py-2 text-on-surface";

type FormState = {
  title: string;
  authors: string;
  genres: string;
  synopsis: string;
  coverUrl: string;
  publishedYear: string;
  pageCount: string;
  isbn13: string;
  language: string;
};

function bookToForm(book: Book): FormState {
  return {
    title: book.title,
    authors: book.authors.join(", "),
    genres: book.genres.join(", "),
    synopsis: book.synopsis ?? "",
    coverUrl: book.coverUrl ?? "",
    publishedYear: book.publishedYear?.toString() ?? "",
    pageCount: book.pageCount?.toString() ?? "",
    isbn13: book.isbn13 ?? "",
    language: book.language ?? "",
  };
}

/**
 * Edición de los metadatos de un libro ya catalogado (título, portada, etc.).
 * Colapsado es solo un botón "Editar ficha"; desplegado, el mismo formulario
 * de /add pero contra `updateBookDetails`.
 */
export default function BookDetailsEditor({ book }: { book: Book }) {
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function submit() {
    if (!form || saving) return;
    setError(null);

    const year = Number(form.publishedYear);
    const pages = Number(form.pageCount);
    const input: BookDetailsInput = {
      googleId: book.googleId ?? undefined,
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
    };

    startSaving(async () => {
      const result = await updateBookDetails(book.id, input);
      if (result.ok) {
        setForm(null);
      } else {
        setError(result.error);
      }
    });
  }

  if (!form) {
    return (
      <button
        type="button"
        onClick={() => setForm(bookToForm(book))}
        className="inline-flex items-center gap-1.5 text-label-md font-semibold tracking-wider text-primary hover:underline"
      >
        <Icon name="edit" className="text-[16px]" />
        Editar ficha
      </button>
    );
  }

  return (
    <div className="vellum-card rounded-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-headline-sm font-semibold text-on-surface">
          Editar ficha
        </h2>
        <button
          type="button"
          onClick={() => setForm(null)}
          aria-label="Cerrar edición"
          className="text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <Icon name="close" className="text-[20px]" />
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-sm border border-error/30 bg-error-container/40 p-3">
          <Icon name="error" className="mt-0.5 text-error" />
          <p className="text-sm text-on-error-container">{error}</p>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="space-y-5"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <span className={LABEL}>Portada</span>
            <div className="vellum-card relative aspect-[2/3] w-full overflow-hidden rounded-sm">
              <BookCover
                src={form.coverUrl || null}
                title={form.title || "Sin título"}
              />
            </div>
            <label htmlFor="edit-coverUrl" className={`${LABEL} mt-3`}>
              URL de la portada
            </label>
            <input
              id="edit-coverUrl"
              type="text"
              value={form.coverUrl}
              onChange={(e) => set("coverUrl", e.target.value)}
              placeholder="https://…"
              className={`${INPUT} text-sm`}
            />
          </div>

          <div className="space-y-4 sm:col-span-8">
            <div>
              <label htmlFor="edit-title" className={LABEL}>
                Título *
              </label>
              <input
                id="edit-title"
                type="text"
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="edit-authors" className={LABEL}>
                Autores * (separados por comas)
              </label>
              <input
                id="edit-authors"
                type="text"
                required
                value={form.authors}
                onChange={(e) => set("authors", e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="edit-genres" className={LABEL}>
                Géneros (separados por comas)
              </label>
              <input
                id="edit-genres"
                type="text"
                value={form.genres}
                onChange={(e) => set("genres", e.target.value)}
                className={INPUT}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label htmlFor="edit-publishedYear" className={LABEL}>
                  Año
                </label>
                <input
                  id="edit-publishedYear"
                  type="number"
                  value={form.publishedYear}
                  onChange={(e) => set("publishedYear", e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label htmlFor="edit-pageCount" className={LABEL}>
                  Páginas
                </label>
                <input
                  id="edit-pageCount"
                  type="number"
                  value={form.pageCount}
                  onChange={(e) => set("pageCount", e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label htmlFor="edit-language" className={LABEL}>
                  Idioma
                </label>
                <input
                  id="edit-language"
                  type="text"
                  value={form.language}
                  onChange={(e) => set("language", e.target.value)}
                  placeholder="es"
                  className={INPUT}
                />
              </div>
              <div>
                <label htmlFor="edit-isbn13" className={LABEL}>
                  ISBN
                </label>
                <input
                  id="edit-isbn13"
                  type="text"
                  value={form.isbn13}
                  onChange={(e) => set("isbn13", e.target.value)}
                  className={`${INPUT} font-mono`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="edit-synopsis" className={LABEL}>
                Sinopsis
              </label>
              <textarea
                id="edit-synopsis"
                rows={4}
                value={form.synopsis}
                onChange={(e) => set("synopsis", e.target.value)}
                className={`${INPUT} resize-y`}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-end gap-3 border-t border-outline-variant/30 pt-4 sm:flex-row">
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
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary-container px-8 py-2 text-label-md font-semibold tracking-wider text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
          >
            <Icon name="save" className="text-sm" />
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
