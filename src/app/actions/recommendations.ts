"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { db } from "@/db";
import {
  books,
  recommendationRuns,
  type RecommendationItem,
} from "@/db/schema";
import { requireUser } from "@/lib/session";
import { amazonSearchUrl, normalizeText, STATUS_LABELS } from "@/lib/books";
import { getVolume, lookupVolume } from "@/lib/google-books";
import { listLibraryForPrompt, UUID_REGEX } from "@/lib/queries";
import type { ActionResult } from "./books";

const recommendationSchema = z.object({
  recommendations: z
    .array(
      z.object({
        title: z.string().min(1),
        author: z.string().min(1),
        reason: z.string().min(1),
        affinity: z.number().int().min(0).max(100),
      }),
    )
    .min(4)
    .max(8),
});

type LibraryBook = Awaited<ReturnType<typeof listLibraryForPrompt>>[number];

function findOwned(
  library: LibraryBook[],
  title: string,
  author: string,
): LibraryBook | undefined {
  const recTitle = normalizeText(title);
  const recAuthorTokens = new Set(
    normalizeText(author)
      .split(" ")
      .filter((t) => t.length > 2),
  );

  return library.find((book) => {
    const ownTitle = normalizeText(book.title);
    const titleEquals = ownTitle === recTitle;
    const titleContains =
      ownTitle.includes(recTitle) || recTitle.includes(ownTitle);
    if (!titleEquals && !titleContains) return false;

    const ownAuthorTokens = normalizeText(book.authors.join(" "))
      .split(" ")
      .filter((t) => t.length > 2);
    const authorOverlap = ownAuthorTokens.some((t) => recAuthorTokens.has(t));

    // Título idéntico basta si no hay autores con los que comparar.
    if (titleEquals) return authorOverlap || ownAuthorTokens.length === 0;
    return authorOverlap;
  });
}

export async function generateRecommendations(): Promise<ActionResult> {
  const user = await requireUser();

  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      error:
        "Falta configurar OPENAI_API_KEY en el servidor (.env.local o Vercel).",
    };
  }

  const library = await listLibraryForPrompt(user.id);
  if (library.length < 3) {
    return {
      ok: false,
      error:
        "Añade al menos 3 libros a tu biblioteca para que la IA conozca tus gustos.",
    };
  }

  const summary = library
    .map((book) => {
      const parts = [
        `"${book.title}" de ${book.authors.join(", ") || "autor desconocido"}`,
        `géneros: ${book.genres.join(", ") || "sin clasificar"}`,
        `estado: ${STATUS_LABELS[book.status]}`,
      ];
      if (book.rating) parts.push(`mi nota: ${book.rating}/5`);
      if (book.favorite) parts.push("favorito");
      return `- ${parts.join(" · ")}`;
    })
    .join("\n");

  const modelName = process.env.OPENAI_MODEL || "gpt-5-mini";
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let object: z.infer<typeof recommendationSchema>;
  try {
    const result = await generateObject({
      model: openai(modelName),
      schema: recommendationSchema,
      prompt: `Eres el bibliotecario personal de un lector hispanohablante. Esta es su biblioteca actual:

${summary}

Analiza sus gustos (géneros dominantes, autores, qué valora bien, sus favoritos) y devuelve exactamente 6 recomendaciones de libros reales.

Reglas:
- La mayoría deben ser libros que NO están en su biblioteca (descubrimientos para comprar).
- Puedes incluir como máximo 2 libros que ya estén en su biblioteca con estado "Por leer", si encajan especialmente con sus gustos actuales ("es el momento de leerlo").
- No repitas libros con estado "Leído", "Leyendo" ni "Abandonado".
- "reason": 2-3 frases en español, citando explícitamente los gustos detectados que justifican la recomendación.
- "affinity": 0-100, qué tan bien encaja con sus gustos. Ordena de mayor a menor afinidad.
- Usa el título en español si existe edición en español; si no, el título original.`,
    });
    object = result.object;
  } catch {
    return {
      ok: false,
      error:
        "La IA no respondió correctamente. Comprueba tu API key de OpenAI y vuelve a intentarlo.",
    };
  }

  const items: RecommendationItem[] = await Promise.all(
    object.recommendations
      .sort((a, b) => b.affinity - a.affinity)
      .map(async (rec): Promise<RecommendationItem> => {
        const owned = findOwned(library, rec.title, rec.author);
        const base = {
          title: rec.title,
          author: rec.author,
          reason: rec.reason,
          affinity: rec.affinity,
          buyUrl: amazonSearchUrl(rec.title, rec.author),
        };
        if (owned) {
          return {
            ...base,
            owned: true,
            bookId: owned.id,
            coverUrl: owned.coverUrl ?? undefined,
          };
        }
        const volume = await lookupVolume(rec.title, rec.author);
        return {
          ...base,
          owned: false,
          googleId: volume?.googleId,
          isbn13: volume?.isbn13 ?? undefined,
          coverUrl: volume?.coverUrl ?? undefined,
        };
      }),
  );

  await db.insert(recommendationRuns).values({
    userId: user.id,
    items,
    model: modelName,
  });

  revalidatePath("/recommendations");
  revalidatePath("/");
  return { ok: true };
}

/** Variante para <form action>: mismo comportamiento, sin valor de retorno. */
export async function addRecommendationAction(
  runId: string,
  index: number,
  _formData: FormData,
): Promise<void> {
  await addRecommendationToLibrary(runId, index);
}

/** Añade a "Por leer" una recomendación que el usuario no tiene. */
export async function addRecommendationToLibrary(
  runId: string,
  index: number,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!UUID_REGEX.test(runId)) return { ok: false, error: "Datos no válidos." };

  const runs = await db
    .select()
    .from(recommendationRuns)
    .where(
      and(
        eq(recommendationRuns.id, runId),
        eq(recommendationRuns.userId, user.id),
      ),
    )
    .limit(1);
  const run = runs[0];
  const item = run?.items[index];
  if (!run || !item) return { ok: false, error: "Recomendación no encontrada." };
  if (item.owned) return { ok: true };

  const volume = item.googleId ? await getVolume(item.googleId) : null;

  const inserted = await db
    .insert(books)
    .values({
      userId: user.id,
      googleId: volume?.googleId ?? null,
      title: volume?.title ?? item.title,
      authors: volume?.authors ?? [item.author],
      genres: volume?.genres ?? [],
      synopsis: volume?.synopsis ?? null,
      coverUrl: volume?.coverUrl ?? item.coverUrl ?? null,
      publishedYear: volume?.publishedYear ?? null,
      pageCount: volume?.pageCount ?? null,
      language: volume?.language ?? null,
      isbn13: volume?.isbn13 ?? item.isbn13 ?? null,
      status: "to_read",
    })
    .onConflictDoNothing()
    .returning({ id: books.id });

  const updatedItems = run.items.map((entry, i) =>
    i === index
      ? { ...entry, owned: true, bookId: inserted[0]?.id ?? entry.bookId }
      : entry,
  );
  await db
    .update(recommendationRuns)
    .set({ items: updatedItems })
    .where(eq(recommendationRuns.id, runId));

  revalidatePath("/recommendations");
  revalidatePath("/");
  return { ok: true };
}
