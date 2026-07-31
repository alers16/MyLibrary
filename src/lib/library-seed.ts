import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Dueño de la biblioteca que se clona a los usuarios nuevos.
 * Vacío = no se clona nada (cada usuario empieza de cero).
 */
export function sharedLibraryOwner(): string {
  return (process.env.SHARED_LIBRARY_OWNER_EMAIL ?? "").trim().toLowerCase();
}

/**
 * Copia la biblioteca del dueño al usuario indicado.
 *
 * Cada copia es independiente: el estado de lectura arranca en "Por leer" y la
 * valoración, el favorito y las notas quedan vacíos, para que cada persona
 * lleve su propio seguimiento sobre los mismos libros físicos.
 *
 * Es idempotente y acumulativa: solo inserta los títulos que el destinatario
 * todavía no tiene, así que puede reejecutarse para añadir novedades.
 *
 * @returns cuántos libros se han copiado.
 */
export async function copySharedLibrary(
  targetUserId: string,
  targetEmail: string,
): Promise<number> {
  const owner = sharedLibraryOwner();
  if (!owner) return 0;
  if (targetEmail.trim().toLowerCase() === owner) return 0;

  const result = await db.execute(sql`
    INSERT INTO books (
      user_id, google_id, isbn13, title, authors, genres,
      synopsis, cover_url, published_year, page_count, language, status
    )
    SELECT
      ${targetUserId}, b.google_id, b.isbn13, b.title, b.authors, b.genres,
      b.synopsis, b.cover_url, b.published_year, b.page_count, b.language, 'to_read'
    FROM books b
    JOIN "user" o ON o.id = b.user_id
    WHERE lower(o.email) = ${owner}
      AND NOT EXISTS (
        SELECT 1 FROM books x
        WHERE x.user_id = ${targetUserId}
          AND lower(x.title) = lower(b.title)
          AND coalesce(x.authors[1], '') = coalesce(b.authors[1], '')
      )
    ON CONFLICT (user_id, google_id) DO NOTHING
    RETURNING id
  `);

  return Array.isArray(result) ? result.length : (result.rows?.length ?? 0);
}
