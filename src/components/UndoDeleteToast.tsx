"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreBook, type RestoreBookInput } from "@/app/actions/books";
import Icon from "./Icon";

/** Clave de sessionStorage donde BookEditor deja el libro recién borrado. */
export const DELETED_BOOK_KEY = "libribox:deleted-book";

type DeletedPayload = { title: string; book: RestoreBookInput };

/**
 * Aviso "Libro eliminado — Deshacer". El borrado es un DELETE real, así que
 * la ficha viaja por sessionStorage y "Deshacer" la reinserta tal cual estaba.
 */
export default function UndoDeleteToast() {
  const router = useRouter();
  const [payload, setPayload] = useState<DeletedPayload | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DELETED_BOOK_KEY);
      if (raw) setPayload(JSON.parse(raw) as DeletedPayload);
    } catch {
      sessionStorage.removeItem(DELETED_BOOK_KEY);
    }
  }, []);

  // El aviso se retira solo pasados 15 segundos.
  useEffect(() => {
    if (!payload) return;
    const handle = setTimeout(() => dismiss(), 15000);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  function dismiss() {
    sessionStorage.removeItem(DELETED_BOOK_KEY);
    setPayload(null);
  }

  function undo() {
    if (!payload || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await restoreBook(payload.book);
      if (result.ok) {
        dismiss();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!payload) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-outline-variant bg-inverse-surface px-4 py-3 shadow-lg lg:bottom-6">
      <Icon name="delete" className="shrink-0 text-[20px] text-inverse-on-surface/70" />
      <p className="min-w-0 flex-1 truncate text-sm text-inverse-on-surface">
        {error ?? (
          <>
            «{payload.title}» eliminado
          </>
        )}
      </p>
      <button
        type="button"
        onClick={undo}
        disabled={pending}
        className="shrink-0 rounded-full px-3 py-1 text-label-md font-semibold tracking-wider text-tertiary-fixed-dim transition-colors hover:bg-white/10 disabled:opacity-60"
      >
        {pending ? "Restaurando…" : "Deshacer"}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="shrink-0 text-inverse-on-surface/60 transition-colors hover:text-inverse-on-surface"
      >
        <Icon name="close" className="text-[18px]" />
      </button>
    </div>
  );
}
