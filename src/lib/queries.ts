import { and, asc, count, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { books, recommendationRuns, type BookRow } from "@/db/schema";
import type { ReadingStatus, SortOption } from "@/lib/books";

export type LibraryFilters = {
  status?: ReadingStatus;
  q?: string;
  genre?: string;
  favorites?: boolean;
  minRating?: number;
  language?: string;
  noCover?: boolean;
  sort: SortOption;
  limit: number;
};

function filterConditions(userId: string, filters: LibraryFilters) {
  const conditions = [eq(books.userId, userId)];

  if (filters.status) conditions.push(eq(books.status, filters.status));
  if (filters.q) {
    const like = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(books.title, like),
        sql`array_to_string(${books.authors}, ' ') ILIKE ${like}`,
        ilike(books.synopsis, like),
        ilike(books.notes, like),
      )!,
    );
  }
  if (filters.genre) {
    conditions.push(sql`${filters.genre} = ANY(${books.genres})`);
  }
  if (filters.favorites) conditions.push(eq(books.favorite, true));
  if (filters.minRating) conditions.push(gte(books.rating, filters.minRating));
  if (filters.language) conditions.push(eq(books.language, filters.language));
  if (filters.noCover) conditions.push(isNull(books.coverUrl));

  return and(...conditions);
}

function sortOrderings(sort: SortOption) {
  return {
    recent: [desc(books.addedAt)],
    title: [asc(books.title)],
    author: [sql`${books.authors}[1] ASC NULLS LAST`, asc(books.title)],
    year: [sql`${books.publishedYear} DESC NULLS LAST`, desc(books.addedAt)],
    rating: [sql`${books.rating} DESC NULLS LAST`, desc(books.addedAt)],
  }[sort];
}

export async function listBooks(
  userId: string,
  filters: LibraryFilters,
): Promise<{ rows: BookRow[]; total: number }> {
  const where = filterConditions(userId, filters);

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(books)
      .where(where)
      .orderBy(...sortOrderings(filters.sort))
      .limit(filters.limit),
    db.select({ total: count() }).from(books).where(where),
  ]);

  return { rows, total: totals[0]?.total ?? 0 };
}

/** Ids ordenados del resultado actual (para anterior/siguiente en la ficha). */
export async function listBookIds(
  userId: string,
  filters: LibraryFilters,
): Promise<string[]> {
  const rows = await db
    .select({ id: books.id })
    .from(books)
    .where(filterConditions(userId, filters))
    .orderBy(...sortOrderings(filters.sort))
    .limit(2000);
  return rows.map((r) => r.id);
}

/** Recuento por estado (chips del dashboard). */
export async function countByStatus(
  userId: string,
): Promise<Record<ReadingStatus | "all", number>> {
  const rows = await db
    .select({ status: books.status, total: count() })
    .from(books)
    .where(eq(books.userId, userId))
    .groupBy(books.status);

  const result: Record<ReadingStatus | "all", number> = {
    all: 0,
    to_read: 0,
    reading: 0,
    finished: 0,
    dnf: 0,
  };
  for (const row of rows) {
    result[row.status] = row.total;
    result.all += row.total;
  }
  return result;
}

/** Idiomas presentes en la biblioteca (filtro del dashboard). */
export async function listLanguages(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ language: books.language })
    .from(books)
    .where(eq(books.userId, userId))
    .orderBy(asc(books.language));
  return rows
    .map((r) => r.language)
    .filter((lang): lang is string => !!lang);
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

/**
 * Resumen de la biblioteca para el prompt de la IA.
 *
 * El orden importa: primero lo que revela los gustos (mejor valorados, luego
 * leídos y favoritos) y al final el resto. Así, si alguna vez hay que recortar,
 * se pierde lo menos informativo.
 */
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
    .orderBy(
      sql`${books.rating} DESC NULLS LAST`,
      sql`(${books.status} = 'finished') DESC`,
      sql`${books.favorite} DESC`,
      desc(books.addedAt),
    )
    .limit(600);
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

/** Historial de generaciones (la más reciente primero). */
export async function listRecommendationRuns(userId: string, limit = 10) {
  return db
    .select()
    .from(recommendationRuns)
    .where(eq(recommendationRuns.userId, userId))
    .orderBy(desc(recommendationRuns.createdAt))
    .limit(limit);
}

export async function getRecommendationRun(userId: string, runId: string) {
  const rows = await db
    .select()
    .from(recommendationRuns)
    .where(
      and(eq(recommendationRuns.id, runId), eq(recommendationRuns.userId, userId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

/* ── Estadísticas ──────────────────────────────────────────────────── */

export type LibraryStats = {
  byStatus: Record<ReadingStatus, number>;
  total: number;
  favorites: number;
  pagesTotal: number;
  pagesRead: number;
  avgRating: number | null;
  ratingDistribution: { rating: number; total: number }[];
  topGenres: { genre: string; total: number }[];
  topAuthors: { author: string; total: number }[];
  addedByMonth: { month: string; total: number }[];
  finishedByMonth: { month: string; total: number }[];
};

export async function getLibraryStats(userId: string): Promise<LibraryStats> {
  const [general, ratings, genres, authors, added, finished] =
    await Promise.all([
      db.execute<{
        status: ReadingStatus;
        total: number;
        favorites: number;
        pages: number | null;
        pages_read: number | null;
        avg_rating: string | null;
      }>(sql`
        SELECT status,
               count(*)::int AS total,
               count(*) FILTER (WHERE favorite)::int AS favorites,
               sum(page_count)::int AS pages,
               sum(page_count) FILTER (WHERE status = 'finished')::int AS pages_read,
               avg(rating) AS avg_rating
        FROM ${books} WHERE ${books.userId} = ${userId}
        GROUP BY status
      `),
      db.execute<{ rating: number; total: number }>(sql`
        SELECT rating, count(*)::int AS total
        FROM ${books}
        WHERE ${books.userId} = ${userId} AND rating IS NOT NULL
        GROUP BY rating ORDER BY rating DESC
      `),
      db.execute<{ genre: string; total: number }>(sql`
        SELECT unnest(genres) AS genre, count(*)::int AS total
        FROM ${books} WHERE ${books.userId} = ${userId}
        GROUP BY 1 ORDER BY 2 DESC, 1 ASC LIMIT 8
      `),
      db.execute<{ author: string; total: number }>(sql`
        SELECT unnest(authors) AS author, count(*)::int AS total
        FROM ${books} WHERE ${books.userId} = ${userId}
        GROUP BY 1 ORDER BY 2 DESC, 1 ASC LIMIT 8
      `),
      db.execute<{ month: string; total: number }>(sql`
        SELECT to_char(added_at, 'YYYY-MM') AS month, count(*)::int AS total
        FROM ${books} WHERE ${books.userId} = ${userId}
          AND added_at > now() - interval '12 months'
        GROUP BY 1 ORDER BY 1 ASC
      `),
      db.execute<{ month: string; total: number }>(sql`
        SELECT to_char(coalesce(finished_at, updated_at), 'YYYY-MM') AS month,
               count(*)::int AS total
        FROM ${books} WHERE ${books.userId} = ${userId}
          AND status = 'finished'
          AND coalesce(finished_at, updated_at) > now() - interval '12 months'
        GROUP BY 1 ORDER BY 1 ASC
      `),
    ]);

  const byStatus: Record<ReadingStatus, number> = {
    to_read: 0,
    reading: 0,
    finished: 0,
    dnf: 0,
  };
  let total = 0;
  let favorites = 0;
  let pagesTotal = 0;
  let pagesRead = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  for (const row of general.rows) {
    byStatus[row.status] = row.total;
    total += row.total;
    favorites += row.favorites;
    pagesTotal += row.pages ?? 0;
    pagesRead += row.pages_read ?? 0;
  }
  for (const row of ratings.rows) {
    ratingSum += row.rating * row.total;
    ratingCount += row.total;
  }

  return {
    byStatus,
    total,
    favorites,
    pagesTotal,
    pagesRead,
    avgRating: ratingCount > 0 ? ratingSum / ratingCount : null,
    ratingDistribution: ratings.rows,
    topGenres: genres.rows,
    topAuthors: authors.rows,
    addedByMonth: added.rows,
    finishedByMonth: finished.rows,
  };
}

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
