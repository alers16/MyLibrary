"use client";

import Link from "next/link";
import { useTransition } from "react";
import { updateBook } from "@/app/actions/books";
import { STATUS_LABELS, type Book, type ReadingStatus } from "@/lib/books";
import BookCover from "./BookCover";
import Icon from "./Icon";

const BADGE_STYLES: Record<ReadingStatus, string> = {
  reading: "bg-inverse-surface/80 text-inverse-on-surface",
  finished: "bg-primary-container/90 text-on-primary",
  to_read: "bg-outline-variant/80 text-on-surface-variant",
  dnf: "bg-error-container/90 text-on-error-container",
};

export default function BookCard({ book }: { book: Book }) {
  const [, startTransition] = useTransition();

  return (
    <Link href={`/book/${book.id}`} className="group block">
      <article>
        <div className="vellum-card book-shadow relative mb-3 aspect-[2/3] overflow-hidden rounded-xs">
          <BookCover src={book.coverUrl} title={book.title} />
          <span
            className={`absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase backdrop-blur-sm ${BADGE_STYLES[book.status]}`}
          >
            {STATUS_LABELS[book.status]}
          </span>
          <button
            type="button"
            aria-label={
              book.favorite ? "Quitar de favoritos" : "Marcar como favorito"
            }
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startTransition(async () => {
                await updateBook(book.id, { favorite: !book.favorite });
              });
            }}
            className={`absolute top-1.5 left-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
              book.favorite
                ? "bg-inverse-surface/60 text-tertiary-fixed-dim"
                : "bg-inverse-surface/40 text-white/70 opacity-0 group-hover:opacity-100"
            }`}
          >
            <Icon
              name="star"
              filled={book.favorite}
              className="text-[18px]"
            />
          </button>
        </div>
        <h3 className="line-clamp-1 font-display text-[18px] leading-snug font-semibold text-on-surface transition-colors group-hover:text-primary">
          {book.title}
        </h3>
        <p className="line-clamp-1 text-label-md text-on-surface-variant">
          {book.authors.join(", ") || "Autor desconocido"}
        </p>
        {book.rating ? (
          <p className="mt-0.5 flex items-center gap-1 text-label-sm font-medium text-tertiary">
            <Icon name="star" filled className="text-[14px]" />
            {book.rating}/5
          </p>
        ) : null}
      </article>
    </Link>
  );
}
