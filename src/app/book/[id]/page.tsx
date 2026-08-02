import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getBook, listBookIds, UUID_REGEX } from "@/lib/queries";
import { parseLibraryFilters, type RawSearchParams } from "@/lib/filters";
import BookCover from "@/components/BookCover";
import BookEditor from "@/components/BookEditor";
import BookDetailsEditor from "@/components/BookDetailsEditor";
import CoverCapture from "@/components/CoverCapture";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "Ficha del libro",
};

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await requireUser();
  const [{ id }, rawParams] = await Promise.all([params, searchParams]);
  if (!UUID_REGEX.test(id)) notFound();

  const book = await getBook(user.id, id);
  if (!book) notFound();

  // La tarjeta llega con los filtros del dashboard en la URL: sirven para
  // volver al mismo resultado y para navegar anterior/siguiente dentro de él.
  const filters = parseLibraryFilters(rawParams);
  const qs = new URLSearchParams(
    Object.entries(rawParams).flatMap(([key, value]) =>
      typeof value === "string" && key !== "limit" ? [[key, value]] : [],
    ),
  ).toString();
  const backHref = qs ? `/?${qs}` : "/";
  const detailHref = (bookId: string) =>
    qs ? `/book/${bookId}?${qs}` : `/book/${bookId}`;

  const ids = await listBookIds(user.id, { ...filters, limit: 2000 });
  const index = ids.indexOf(book.id);
  const prevId = index > 0 ? ids[index - 1] : null;
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : null;

  const dateFmt: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };

  const meta: { icon: string; label: string; value: string }[] = [];
  if (book.publishedYear)
    meta.push({
      icon: "calendar_month",
      label: "Año",
      value: String(book.publishedYear),
    });
  if (book.pageCount)
    meta.push({
      icon: "menu_book",
      label: "Páginas",
      value: String(book.pageCount),
    });
  if (book.language)
    meta.push({
      icon: "language",
      label: "Idioma",
      value: book.language.toUpperCase(),
    });
  if (book.isbn13)
    meta.push({ icon: "barcode", label: "ISBN", value: book.isbn13 });
  meta.push({
    icon: "bookmark_added",
    label: "Añadido",
    value: book.addedAt.toLocaleDateString("es-ES", dateFmt),
  });
  if (book.startedAt)
    meta.push({
      icon: "auto_stories",
      label: "Empezado",
      value: book.startedAt.toLocaleDateString("es-ES", dateFmt),
    });
  if (book.finishedAt)
    meta.push({
      icon: "task_alt",
      label: "Terminado",
      value: book.finishedAt.toLocaleDateString("es-ES", dateFmt),
    });

  return (
    <div className="px-4 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-[1000px]">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-label-md font-semibold tracking-wider text-primary hover:underline"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            Volver a la biblioteca
          </Link>

          {(prevId || nextId) && (
            <div className="flex items-center gap-1">
              {prevId ? (
                <Link
                  href={detailHref(prevId)}
                  aria-label="Libro anterior"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                >
                  <Icon name="chevron_left" className="text-[20px]" />
                </Link>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/40 text-outline-variant">
                  <Icon name="chevron_left" className="text-[20px]" />
                </span>
              )}
              {index >= 0 && (
                <span className="px-1 text-label-sm font-medium text-on-surface-variant">
                  {index + 1} / {ids.length}
                </span>
              )}
              {nextId ? (
                <Link
                  href={detailHref(nextId)}
                  aria-label="Libro siguiente"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                >
                  <Icon name="chevron_right" className="text-[20px]" />
                </Link>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/40 text-outline-variant">
                  <Icon name="chevron_right" className="text-[20px]" />
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="vellum-card relative mx-auto aspect-[2/3] w-56 overflow-hidden rounded-xs shadow-md md:w-full">
              <BookCover src={book.coverUrl} title={book.title} />
            </div>
            <CoverCapture bookId={book.id} hasCover={!!book.coverUrl} />
            <dl className="mt-6 space-y-3">
              {meta.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 text-sm"
                >
                  <Icon
                    name={item.icon}
                    className="text-[18px] text-on-surface-variant"
                  />
                  <dt className="text-label-md font-semibold tracking-wider text-on-surface-variant">
                    {item.label}
                  </dt>
                  <dd className="ml-auto text-on-surface">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="md:col-span-8">
            {book.genres.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {book.genres.map((genre) => (
                  <Link
                    key={genre}
                    href={`/?genero=${encodeURIComponent(genre)}`}
                    className="rounded-full border border-outline-variant px-3 py-0.5 text-label-sm font-medium tracking-wider text-on-surface-variant uppercase transition-colors hover:bg-surface-container-high"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-headline-md font-semibold text-on-surface">
                  {book.title}
                </h1>
                <p className="mt-1 text-body-lg text-on-surface-variant italic">
                  de {book.authors.join(", ") || "autor desconocido"}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <BookEditor book={book} />
            </div>

            <div className="mt-6">
              <BookDetailsEditor book={book} />
            </div>

            {book.synopsis && (
              <section className="mt-10">
                <h2 className="mb-3 font-display text-headline-sm font-semibold text-on-surface">
                  Sinopsis
                </h2>
                <p className="whitespace-pre-line text-on-surface-variant">
                  {book.synopsis}
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
