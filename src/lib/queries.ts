import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { books, recommendationRuns, type BookRow } from "@/db/schema";
import type { ReadingStatus, SortOption } from "@/lib/books";

export type LibraryFilters = {
  status?: ReadingStatus;
  q?: string;
  genre?: string;
  favorites?: boolean;
  sort: SortOption;
  limit: number;
};

export async function listBooks(
  userId: string,
  filters: LibraryFilters,
): Promise<{ rows: BookRow[]; total: number }> {
  const conditions = [eq(books.userId, userId)];

  if (filters.status) conditions.push(eq(books.status, filters.status));
  if (filters.q) {
    const like = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(books.title, like),
        sql`array_to_string(${books.authors}, ' ') ILIKE ${like}`,
      )!,
    );
  }
  if (filters.genre) {
    conditions.push(sql`${filters.genre} = ANY(${books.genres})`);
  }
  if (filters.favorites) conditions.push(eq(books.favorite, true));

  const orderings = {
    recent: [desc(books.addedAt)],
    title: [asc(books.title)],
    author: [sql`${books.authors}[1] ASC NULLS LAST`, asc(books.title)],
    year: [sql`${books.publishedYear} DESC NULLS LAST`, desc(books.addedAt)],
    rating: [sql`${books.rating} DESC NULLS LAST`, desc(books.addedAt)],
  }[filters.sort];

  const where = and(...conditions);

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(books)
      .where(where)
      .orderBy(...orderings)
      .limit(filters.limit),
    db.select({ total: count() }).from(books).where(where),
  ]);

  return { rows, total: totals[0]?.total ?? 0 };
}

/** Géneros distintos presentes en la biblioteca del usuario (para el filtro). */
export async function listGenres(userId: string): Promise<string[]> {
  const result = await db.execute<{ genre: string }>(
    sql`SELECT DISTINCT unnest(${books.genres}) AS genre FROM ${books} WHERE ${books.userId} = ${userId} ORDER BY genre ASC`,
  );
  return result.rows.map((row) => row.genre);
}

export async function getBook(
  userId: string,
  bookId: string,
): Promise<BookRow | null> {
  const rows = await db
    .select()
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Resumen de toda la biblioteca para el prompt de la IA. */
export async function listLibraryForPrompt(userId: string) {
  return db
    .select({
      id: books.id,
      title: books.title,
      authors: books.authors,
      genres: books.genres,
      status: books.status,
      rating: books.rating,
      favorite: books.favorite,
      coverUrl: books.coverUrl,
    })
    .from(books)
    .where(eq(books.userId, userId))
    .orderBy(desc(books.addedAt))
    .limit(120);
}

export async function getLatestRecommendationRun(userId: string) {
  const rows = await db
    .select()
    .from(recommendationRuns)
    .where(eq(recommendationRuns.userId, userId))
    .orderBy(desc(recommendationRuns.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
