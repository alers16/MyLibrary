/**
 * Importador masivo de la biblioteca física a Neon.
 *
 *   node scripts/import-books.mjs [--dry-run] [--email=...]
 *
 * Enriquece cada título con Google Books (portada, sinopsis, ISBN, páginas) y
 * cachea las respuestas en scripts/.gbooks-cache.json para que reejecutar sea
 * instantáneo. Es idempotente: salta los libros que ya existen para ese usuario.
 */
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import fs from "node:fs";
import { CATALOG } from "./books-seed.mjs";

dotenv.config({ path: ".env.local", quiet: true });

const DRY_RUN = process.argv.includes("--dry-run");
const EMAIL =
  process.argv.find((a) => a.startsWith("--email="))?.slice("--email=".length) ??
  "alerosan16@gmail.com";
const STATUS = "to_read";
const CACHE_PATH = "scripts/.gbooks-cache.json";
const API = "https://www.googleapis.com/books/v1";
const KEY = process.env.GOOGLE_BOOKS_API_KEY;

const sql = neon(process.env.DATABASE_URL);

/* ── utilidades ────────────────────────────────────────────────────── */

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (s) => new Set(normalize(s).split(" ").filter((t) => t.length > 2));

/** Solapamiento respecto al conjunto más pequeño (0–1). */
function overlap(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let hits = 0;
  for (const t of A) if (B.has(t)) hits += 1;
  return hits / Math.min(A.size, B.size);
}

/** "Novela Histórica (Egipto)" → ["Novela Histórica", "Egipto"] */
function parseGenres(category) {
  const out = [];
  for (const chunk of category.split("/")) {
    const paren = chunk.match(/\(([^)]+)\)/);
    const base = chunk.replace(/\([^)]*\)/g, "").trim();
    if (base) out.push(base);
    if (paren) out.push(paren[1].trim());
  }
  const seen = new Map();
  for (const g of out) if (!seen.has(g.toLowerCase())) seen.set(g.toLowerCase(), g);
  return [...seen.values()];
}

function stripHtml(value) {
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── caché de Google Books ─────────────────────────────────────────── */

const cache = fs.existsSync(CACHE_PATH)
  ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"))
  : {};

function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1));
}

async function fetchVolumes(query, allLanguages) {
  const cacheKey = `${allLanguages ? "all" : "es"}::${query}`;
  if (cacheKey in cache) return cache[cacheKey];

  const lang = allLanguages ? "" : "&langRestrict=es";
  const url =
    `${API}/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books` +
    `&orderBy=relevance${lang}${KEY ? `&key=${KEY}` : ""}`;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url);
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      cache[cacheKey] = [];
      return [];
    }
    const data = await res.json();
    const items = (data.items ?? []).map((v) => ({
      googleId: v.id,
      title: v.volumeInfo?.title ?? "",
      subtitle: v.volumeInfo?.subtitle ?? "",
      authors: v.volumeInfo?.authors ?? [],
      description: v.volumeInfo?.description ?? null,
      publishedDate: v.volumeInfo?.publishedDate ?? null,
      pageCount: v.volumeInfo?.pageCount ?? null,
      language: v.volumeInfo?.language ?? null,
      isbn13:
        v.volumeInfo?.industryIdentifiers?.find((i) => i.type === "ISBN_13")
          ?.identifier ?? null,
      thumbnail:
        v.volumeInfo?.imageLinks?.thumbnail ??
        v.volumeInfo?.imageLinks?.smallThumbnail ??
        null,
    }));
    cache[cacheKey] = items;
    return items;
  }
  cache[cacheKey] = [];
  return [];
}

/** Busca la mejor edición para (título, autor). null si nada convence. */
async function lookup(title, author) {
  const cleanTitle = title.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const realAuthor = author.startsWith("Varios") ? "" : author.replace(/\([^)]*\)/g, "").trim();

  const queries = [
    [`intitle:"${cleanTitle}"${realAuthor ? ` inauthor:"${realAuthor}"` : ""}`, false],
    [`intitle:"${cleanTitle}"${realAuthor ? ` inauthor:"${realAuthor}"` : ""}`, true],
    [`${cleanTitle} ${realAuthor}`, false],
    [`${cleanTitle} ${realAuthor}`, true],
  ];

  let best = null;
  let bestScore = 0;

  for (const [query, allLanguages] of queries) {
    const items = await fetchVolumes(query, allLanguages);
    for (const item of items) {
      const titleScore = overlap(cleanTitle, `${item.title} ${item.subtitle}`);
      const authorScore = realAuthor
        ? Math.max(0, ...item.authors.map((a) => overlap(realAuthor, a)))
        : 1;
      if (titleScore < 0.6) continue;
      if (realAuthor && authorScore < 0.5) continue;

      // Preferimos ediciones con portada, en español y con sinopsis.
      const score =
        titleScore * 3 +
        authorScore * 2 +
        (item.thumbnail ? 1.5 : 0) +
        (item.description ? 1 : 0) +
        (item.language === "es" ? 0.5 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (best && best.thumbnail && best.description) break;
  }
  return best;
}

/* ── programa principal ────────────────────────────────────────────── */

const users = await sql`SELECT id, email FROM "user" WHERE lower(email) = ${EMAIL.toLowerCase()}`;
if (users.length === 0) {
  const all = await sql`SELECT email FROM "user"`;
  console.error(
    `✖ No existe el usuario ${EMAIL} en la BD.\n` +
      `  Haz login con Google en /login primero.\n` +
      `  Usuarios actuales: ${all.map((u) => u.email).join(", ") || "(ninguno)"}`,
  );
  process.exit(1);
}
const userId = users[0].id;
console.log(`Usuario: ${users[0].email} (${userId})`);

const existing = await sql`SELECT title, authors, google_id FROM books WHERE user_id = ${userId}`;
const existingKeys = new Set(
  existing.map((b) => `${normalize(b.title)}|${normalize((b.authors ?? [])[0] ?? "")}`),
);
const usedGoogleIds = new Set(existing.map((b) => b.google_id).filter(Boolean));
console.log(`Ya en la biblioteca: ${existing.length} libros`);

const rows = [];
const notFound = [];
let skipped = 0;
let done = 0;

for (const [title, author, category, year] of CATALOG) {
  done += 1;
  const key = `${normalize(title)}|${normalize(author)}`;
  if (existingKeys.has(key)) {
    skipped += 1;
    continue;
  }
  existingKeys.add(key);

  let match = null;
  try {
    match = await lookup(title, author);
  } catch (err) {
    console.warn(`  ! error consultando "${title}": ${err.message}`);
  }
  if (!match) notFound.push(`${title} — ${author}`);

  // El mismo volumen no puede repetirse: unique (user_id, google_id).
  let googleId = match?.googleId ?? null;
  if (googleId && usedGoogleIds.has(googleId)) googleId = null;
  if (googleId) usedGoogleIds.add(googleId);

  const isbn13 = match?.isbn13 ?? null;
  const coverUrl =
    match?.thumbnail?.replace(/^http:/, "https:") ??
    // `default=false` evita que Open Library devuelva un GIF vacío de 1x1
    // haciéndolo pasar por portada válida.
    (isbn13
      ? `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg?default=false`
      : null);

  rows.push({
    googleId,
    isbn13,
    title,
    authors: [author],
    genres: parseGenres(category),
    synopsis: match?.description ? stripHtml(match.description) : null,
    coverUrl,
    publishedYear: year ?? (match?.publishedDate?.match(/\d{4}/)?.[0] ? Number(match.publishedDate.match(/\d{4}/)[0]) : null),
    pageCount: match?.pageCount ?? null,
    language: match?.language ?? "es",
    status: STATUS,
  });

  if (done % 10 === 0) {
    saveCache();
    console.log(`  ${done}/${CATALOG.length} procesados…`);
  }
}
saveCache();

const withCover = rows.filter((r) => r.coverUrl).length;
console.log(
  `\nCatálogo: ${CATALOG.length} | nuevos: ${rows.length} | ya existían: ${skipped}\n` +
    `Con portada: ${withCover}/${rows.length} | sin coincidencia en Google Books: ${notFound.length}`,
);
if (notFound.length) console.log("Sin datos externos:\n  - " + notFound.join("\n  - "));

if (DRY_RUN) {
  fs.writeFileSync("scripts/.import-preview.json", JSON.stringify(rows, null, 2));
  console.log("\n[dry-run] Nada insertado. Vista previa en scripts/.import-preview.json");
  process.exit(0);
}

if (rows.length === 0) {
  console.log("\nNada que insertar.");
  process.exit(0);
}

const CHUNK = 40;
let inserted = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  const result = await sql`
    INSERT INTO books (
      user_id, google_id, isbn13, title, authors, genres,
      synopsis, cover_url, published_year, page_count, language, status
    )
    SELECT
      ${userId},
      b->>'googleId',
      b->>'isbn13',
      b->>'title',
      ARRAY(SELECT jsonb_array_elements_text(b->'authors')),
      ARRAY(SELECT jsonb_array_elements_text(b->'genres')),
      b->>'synopsis',
      b->>'coverUrl',
      (b->>'publishedYear')::int,
      (b->>'pageCount')::int,
      b->>'language',
      (b->>'status')::reading_status
    FROM jsonb_array_elements(${JSON.stringify(chunk)}::jsonb) AS b
    RETURNING id
  `;
  inserted += result.length;
  console.log(`  insertados ${inserted}/${rows.length}`);
}

const [{ count }] = await sql`SELECT count(*)::int AS count FROM books WHERE user_id = ${userId}`;
console.log(`\n✔ Importación completada. Total en la biblioteca: ${count} libros.`);
