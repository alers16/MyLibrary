"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { books } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { UUID_REGEX } from "@/lib/queries";

export type ActionResult = { ok: true } | { ok: false; error: string };

const statusSchema = z.enum(["to_read", "reading", "finished", "dnf"]);

const addBookSchema = z.object({
  googleId: z.string().trim().max(100).nullish(),
  title: z.string().trim().min(1, "El título es obligatorio").max(300),
  authors: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
  genres: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  synopsis: z.string().trim().max(8000).nullish(),
  coverUrl: z.string().trim().max(1000).nullish(),
  publishedYear: z.coerce.number().int().min(0).max(3000).nullish(),
  pageCount: z.coerce.number().int().min(1).max(100000).nullish(),
  language: z.string().trim().max(8).nullish(),
  isbn13: z.string().trim().max(13).nullish(),
  status: statusSchema.default("to_read"),
  notes: z.string().trim().max(4000).nullish(),
});

export type AddBookInput = z.input<typeof addBookSchema>;

export async function addBook(input: AddBookInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addBookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos del formulario." };
  }
  const data = parsed.data;

  if (data.googleId) {
    const existing = await db
      .select({ id: books.id })
      .from(books)
      .where(
        and(eq(books.userId, user.id), eq(books.googleId, data.googleId)),
      )
      .limit(1);
    if (existing.length > 0) {
      return { ok: false, error: "Ese libro ya está en tu biblioteca." };
    }
  }

  await db
    .insert(books)
    .values({
      userId: user.id,
      googleId: data.googleId || null,
      title: data.title,
      authors: data.authors,
      genres: data.genres,
      synopsis: data.synopsis || null,
      coverUrl: data.coverUrl || null,
      publishedYear: data.publishedYear ?? null,
      pageCount: data.pageCount ?? null,
      language: data.language || null,
      isbn13: data.isbn13 || null,
      status: data.status,
      notes: data.notes || null,
    })
    .onConflictDoNothing();

  revalidatePath("/");
  revalidatePath("/recommendations");
  return { ok: true };
}

const updateBookSchema = z.object({
  status: statusSchema.optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  favorite: z.boolean().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  currentPage: z.number().int().min(0).max(100000).nullable().optional(),
});

export type UpdateBookPatch = z.input<typeof updateBookSchema>;

export async function updateBook(
  bookId: string,
  patch: UpdateBookPatch,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!UUID_REGEX.test(bookId)) return { ok: false, error: "Libro no válido." };
  const parsed = updateBookSchema.safeParse(patch);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return { ok: false, error: "Nada que actualizar." };
  }
  const data: Partial<typeof books.$inferInsert> = { ...parsed.data };

  // Las fechas de lectura se llevan solas según el estado, sin pedir nada:
  // empezar fija startedAt, terminar fija finishedAt, volver a la pila resetea.
  if (parsed.data.status) {
    const rows = await db
      .select({ startedAt: books.startedAt, pageCount: books.pageCount })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, user.id)))
      .limit(1);
    if (rows.length === 0) return { ok: false, error: "Libro no válido." };
    const current = rows[0];

    switch (parsed.data.status) {
      case "reading":
        if (!current.startedAt) data.startedAt = new Date();
        data.finishedAt = null;
        break;
      case "finished":
        if (!current.startedAt) data.startedAt = new Date();
        data.finishedAt = new Date();
        if (current.pageCount) data.currentPage = current.pageCount;
        break;
      case "to_read":
        data.startedAt = null;
        data.finishedAt = null;
        data.currentPage = null;
        break;
      case "dnf":
        data.finishedAt = null;
        break;
    }
  }

  await db
    .update(books)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)));

  revalidatePath("/");
  revalidatePath(`/book/${bookId}`);
  revalidatePath("/recommendations");
  return { ok: true };
}

const bookDetailsSchema = addBookSchema.omit({ status: true, notes: true });

export type BookDetailsInput = z.input<typeof bookDetailsSchema>;

/** Edición de metadatos de un libro ya catalogado (título, portada, etc.). */
export async function updateBookDetails(
  bookId: string,
  input: BookDetailsInput,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!UUID_REGEX.test(bookId)) return { ok: false, error: "Libro no válido." };
  const parsed = bookDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos del formulario." };
  }
  const data = parsed.data;

  await db
    .update(books)
    .set({
      title: data.title,
      authors: data.authors,
      genres: data.genres,
      synopsis: data.synopsis || null,
      coverUrl: data.coverUrl || null,
      publishedYear: data.publishedYear ?? null,
      pageCount: data.pageCount ?? null,
      language: data.language || null,
      isbn13: data.isbn13 || null,
      updatedAt: new Date(),
    })
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)));

  revalidatePath("/");
  revalidatePath(`/book/${bookId}`);
  revalidatePath("/recommendations");
  return { ok: true };
}

const restoreBookSchema = addBookSchema.extend({
  id: z.string().regex(UUID_REGEX),
  rating: z.number().int().min(1).max(5).nullish(),
  favorite: z.boolean().default(false),
  currentPage: z.number().int().min(0).max(100000).nullish(),
  startedAt: z.coerce.date().nullish(),
  finishedAt: z.coerce.date().nullish(),
  addedAt: z.coerce.date().nullish(),
});

export type RestoreBookInput = z.input<typeof restoreBookSchema>;

/** Reinsertar un libro recién borrado (botón "Deshacer" del toast). */
export async function restoreBook(input: RestoreBookInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = restoreBookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "No se pudo restaurar el libro." };
  }
  const data = parsed.data;

  await db
    .insert(books)
    .values({
      id: data.id,
      userId: user.id,
      googleId: data.googleId || null,
      title: data.title,
      authors: data.authors,
      genres: data.genres,
      synopsis: data.synopsis || null,
      coverUrl: data.coverUrl || null,
      publishedYear: data.publishedYear ?? null,
      pageCount: data.pageCount ?? null,
      language: data.language || null,
      isbn13: data.isbn13 || null,
      status: data.status,
      rating: data.rating ?? null,
      favorite: data.favorite,
      notes: data.notes || null,
      currentPage: data.currentPage ?? null,
      startedAt: data.startedAt ?? null,
      finishedAt: data.finishedAt ?? null,
      addedAt: data.addedAt ?? undefined,
    })
    .onConflictDoNothing();

  revalidatePath("/");
  revalidatePath("/recommendations");
  return { ok: true };
}

/** Máximo de la imagen ya comprimida por el cliente (~600 KB decodificados). */
const MAX_COVER_BYTES = 800_000;

const DATA_URL_REGEX = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/**
 * Sube la imagen a Cloudinary con firma propia (API REST, sin SDK).
 * Devuelve la URL https definitiva. `public_id` fijo por libro + overwrite:
 * rehacer la foto reemplaza el asset, y la URL versionada rompe la caché.
 */
async function uploadToCloudinary(
  dataUrl: string,
  publicId: string,
): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("cloudinary-not-configured");
  }

  const params: Record<string, string> = {
    invalidate: "true",
    overwrite: "true",
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const signature = createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");

  const body = new FormData();
  body.set("file", dataUrl);
  for (const [key, value] of Object.entries(params)) body.set(key, value);
  body.set("api_key", apiKey);
  body.set("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`cloudinary-${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error("cloudinary-no-url");
  return json.secure_url;
}

/**
 * Guarda en Cloudinary una foto de la portada (hecha con la cámara y
 * comprimida en el cliente) y apunta cover_url del libro a esa URL.
 */
export async function uploadCoverPhoto(
  bookId: string,
  dataUrl: string,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!UUID_REGEX.test(bookId)) return { ok: false, error: "Libro no válido." };

  if (!DATA_URL_REGEX.test(dataUrl)) {
    return { ok: false, error: "La imagen no es válida (se espera JPEG, PNG o WebP)." };
  }
  const base64Length = dataUrl.length - dataUrl.indexOf(",") - 1;
  if (Math.floor((base64Length * 3) / 4) > MAX_COVER_BYTES) {
    return { ok: false, error: "La imagen es demasiado grande. Vuelve a intentarlo." };
  }

  const owned = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)))
    .limit(1);
  if (owned.length === 0) return { ok: false, error: "Libro no válido." };

  let coverUrl: string;
  try {
    coverUrl = await uploadToCloudinary(dataUrl, `libribox/covers/${bookId}`);
  } catch (error) {
    console.error("[LibriBox] Fallo subiendo la portada a Cloudinary:", error);
    const notConfigured =
      error instanceof Error && error.message === "cloudinary-not-configured";
    return {
      ok: false,
      error: notConfigured
        ? "Cloudinary no está configurado: faltan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el servidor."
        : "No se pudo subir la imagen. Inténtalo de nuevo en un momento.",
    };
  }

  await db
    .update(books)
    .set({ coverUrl, updatedAt: new Date() })
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)));

  revalidatePath("/");
  revalidatePath(`/book/${bookId}`);
  return { ok: true };
}

export async function deleteBook(bookId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!UUID_REGEX.test(bookId)) return { ok: false, error: "Libro no válido." };

  await db
    .delete(books)
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)));

  revalidatePath("/");
  revalidatePath("/recommendations");
  return { ok: true };
}
