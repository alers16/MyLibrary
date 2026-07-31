const API = "https://www.googleapis.com/books/v1";

/** Libro del catálogo externo (Google Books), ya normalizado. */
export type CatalogBook = {
  googleId: string;
  title: string;
  authors: string[];
  genres: string[];
  synopsis: string | null;
  coverUrl: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  language: string | null;
  isbn13: string | null;
};

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    categories?: string[];
    description?: string;
    publishedDate?: string;
    pageCount?: number;
    language?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

function keyParam(): string {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  return key ? `&key=${key}` : "";
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** "Fiction / Fantasy / Epic" → ["Fiction", "Fantasy", "Epic"], sin duplicados. */
function parseGenres(categories: string[] | undefined): string[] {
  const seen = new Map<string, string>();
  for (const category of categories ?? []) {
    for (const raw of category.split("/")) {
      const genre = raw.trim();
      if (!genre) continue;
      const key = genre.toLowerCase();
      if (!seen.has(key)) seen.set(key, genre);
    }
  }
  return [...seen.values()];
}

export function openLibraryCover(isbn13: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`;
}

function parseVolume(volume: GoogleVolume): CatalogBook | null {
  const info = volume.volumeInfo;
  if (!info?.title) return null;

  const isbn13 =
    info.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier ??
    null;

  const rawCover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
  const coverUrl = rawCover
    ? rawCover.replace(/^http:/, "https:")
    : isbn13
      ? openLibraryCover(isbn13)
      : null;

  const yearMatch = info.publishedDate?.match(/\d{4}/);

  return {
    googleId: volume.id,
    title: info.title,
    authors: info.authors ?? [],
    genres: parseGenres(info.categories),
    synopsis: info.description ? stripHtml(info.description) : null,
    coverUrl,
    publishedYear: yearMatch ? Number(yearMatch[0]) : null,
    pageCount: info.pageCount ?? null,
    language: info.language ?? null,
    isbn13,
  };
}

/** Busca en el catálogo. Por defecto prioriza ediciones en español. */
export async function searchVolumes(
  query: string,
  allLanguages = false,
): Promise<CatalogBook[]> {
  const lang = allLanguages ? "" : "&langRestrict=es";
  const url = `${API}/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books&orderBy=relevance${lang}${keyParam()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Google Books respondió ${res.status}`);
  }
  const data = (await res.json()) as { items?: GoogleVolume[] };
  return (data.items ?? [])
    .map(parseVolume)
    .filter((book): book is CatalogBook => book !== null);
}

/** Ficha completa de un volumen (la búsqueda a veces trae la sinopsis recortada). */
export async function getVolume(googleId: string): Promise<CatalogBook | null> {
  const url = `${API}/volumes/${encodeURIComponent(googleId)}?${keyParam().replace(/^&/, "")}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data = (await res.json()) as GoogleVolume;
  return parseVolume(data);
}

/** Localiza un libro por título+autor (para enriquecer recomendaciones IA). */
export async function lookupVolume(
  title: string,
  author: string,
): Promise<CatalogBook | null> {
  const query = `intitle:"${title}" inauthor:"${author}"`;
  try {
    let results = await searchVolumes(query, false);
    if (results.length === 0) results = await searchVolumes(query, true);
    if (results.length === 0) {
      results = await searchVolumes(`${title} ${author}`, true);
    }
    return results.find((b) => b.coverUrl) ?? results[0] ?? null;
  } catch {
    return null;
  }
}
