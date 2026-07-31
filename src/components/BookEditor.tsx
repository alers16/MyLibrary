"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBook, updateBook, type UpdateBookPatch } from "@/app/actions/books";
import { STATUS_OPTIONS, type ReadingStatus } from "@/lib/books";
import Icon from "./Icon";

type Props = {
  bookId: string;
  status: ReadingStatus;
  rating: number | null;
  favorite: boolean;
  notes: string | null;
};

export default function BookEditor({
  bookId,
  status,
  rating,
  favorite,
  notes,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState(notes ?? "");

  function apply(patch: UpdateBookPatch) {
    setError(null);
    startTransition(async () => {
      const result = await updateBook(bookId, patch);
      if (!result.ok) setError(result.error);
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        "¿Seguro que quieres eliminar este libro de tu biblioteca?",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteBook(bookId);
      if (result.ok) {
        router.push("/");
      } else {
        setError(result.error);
      }
    });
  }

  const notesChanged = notesDraft !== (notes ?? "");

  return (
    <div className="vellum-card space-y-6 rounded-xl p-6">
      {error && (
        <div className="flex items-start gap-3 rounded-sm border border-error/30 bg-error-container/40 p-3">
          <Icon name="error" className="mt-0.5 text-error" />
          <p className="text-sm text-on-error-container">{error}</p>
        </div>
      )}

      <div>
        <p className="mb-2 text-label-md font-semibold tracking-wider text-on-surface-variant">
          Estado de lectura
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={pending}
              onClick={() => apply({ status: option.value })}
              className={`rounded-full border px-4 py-1.5 text-label-md font-semibold tracking-wider transition-colors disabled:opacity-60 ${
                status === option.value
                  ? "border-primary-container bg-primary-container text-on-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-8">
        <div>
          <p className="mb-2 text-label-md font-semibold tracking-wider text-on-surface-variant">
            Mi valoración
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                disabled={pending}
                aria-label={`${value} de 5 estrellas`}
                onClick={() =>
                  apply({ rating: rating === value ? null : value })
                }
                className="transition-transform hover:scale-110 disabled:opacity-60"
              >
                <Icon
                  name="star"
                  filled={rating !== null && value <= rating}
                  className={`text-[28px] ${
                    rating !== null && value <= rating
                      ? "text-tertiary-container"
                      : "text-outline-variant"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() => apply({ favorite: !favorite })}
          className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-label-md font-semibold tracking-wider transition-colors disabled:opacity-60 ${
            favorite
              ? "border-tertiary-container bg-tertiary-container/20 text-tertiary"
              : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <Icon name="star" filled={favorite} className="text-[16px]" />
          {favorite ? "Favorito" : "Marcar favorito"}
        </button>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-2 block text-label-md font-semibold tracking-wider text-on-surface-variant"
        >
          Notas personales
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notesDraft}
          onChange={(event) => setNotesDraft(event.target.value)}
          placeholder="p. ej. edición firmada, prestado a…, cita favorita…"
          className="input-minimal w-full resize-y py-2 text-on-surface placeholder:text-outline-variant"
        />
        {notesChanged && (
          <button
            type="button"
            disabled={pending}
            onClick={() => apply({ notes: notesDraft.trim() || null })}
            className="mt-2 inline-flex items-center gap-2 rounded-sm bg-primary-container px-4 py-1.5 text-label-md font-semibold tracking-wider text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Icon name="save" className="text-[16px]" />
            Guardar notas
          </button>
        )}
      </div>

      <div className="border-t border-outline-variant/30 pt-4">
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          className="inline-flex items-center gap-2 rounded-sm border border-error/40 px-4 py-1.5 text-label-md font-semibold tracking-wider text-error transition-colors hover:bg-error-container/40 disabled:opacity-60"
        >
          <Icon name="delete" className="text-[16px]" />
          Eliminar de mi biblioteca
        </button>
      </div>
    </div>
  );
}
