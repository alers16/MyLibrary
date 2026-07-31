"use server";

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

  await db
    .update(books)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)));

  revalidatePath("/");
  revalidatePath(`/book/${bookId}`);
  revalidatePath("/recommendations");
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
