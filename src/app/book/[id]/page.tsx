import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getBook, UUID_REGEX } from "@/lib/queries";
import BookCover from "@/components/BookCover";
import BookEditor from "@/components/BookEditor";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "Ficha del libro",
};

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID_REGEX.test(id)) notFound();

  const book = await getBook(user.id, id);
  if (!book) notFound();

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
    value: book.addedAt.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  });

  return (
    <div className="px-4 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-[1000px]">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-label-md font-semibold tracking-wider text-primary hover:underline"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Volver a la biblioteca
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="vellum-card relative mx-auto aspect-[2/3] w-56 overflow-hidden rounded-xs shadow-md md:w-full">
              <BookCover src={book.coverUrl} title={book.title} />
            </div>
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

            <h1 className="font-display text-headline-md font-semibold text-on-surface">
              {book.title}
            </h1>
            <p className="mt-1 text-body-lg text-on-surface-variant italic">
              de {book.authors.join(", ") || "autor desconocido"}
            </p>

            <div className="mt-6">
              <BookEditor
                bookId={book.id}
                status={book.status}
                rating={book.rating}
                favorite={book.favorite}
                notes={book.notes}
              />
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
