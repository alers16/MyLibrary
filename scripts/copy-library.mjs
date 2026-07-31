/**
 * Copia la biblioteca del dueño a otro usuario ya existente.
 *
 *   node scripts/copy-library.mjs --to=christophe0370@gmail.com
 *   node scripts/copy-library.mjs --to=... --from=... --dry-run
 *
 * Normalmente no hace falta: los usuarios nuevos la heredan solos al registrarse
 * (hook `user.create.after` en src/lib/auth.ts). Esto sirve para quien ya existía
 * o para propagar libros añadidos después.
 */
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const arg = (name) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const DRY_RUN = process.argv.includes("--dry-run");
const TO = arg("to");
const FROM = (
  arg("from") ??
  process.env.SHARED_LIBRARY_OWNER_EMAIL ??
  "alerosan16@gmail.com"
).toLowerCase();

if (!TO) {
  console.error("Falta --to=email. Ejemplo:\n  node scripts/copy-library.mjs --to=christophe0370@gmail.com");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const resolve = async (email) => {
  const rows = await sql`SELECT id, email FROM "user" WHERE lower(email) = ${email.toLowerCase()}`;
  return rows[0] ?? null;
};

const owner = await resolve(FROM);
const target = await resolve(TO);

if (!owner) {
  console.error(`✖ El dueño ${FROM} no existe en la BD.`);
  process.exit(1);
}
if (!target) {
  const all = await sql`SELECT email FROM "user"`;
  console.error(
    `✖ ${TO} todavía no existe en la BD: tiene que entrar una vez con Google.\n` +
      `  (Al hacerlo heredará la biblioteca automáticamente, no hará falta este script.)\n` +
      `  Usuarios actuales: ${all.map((u) => u.email).join(", ")}`,
  );
  process.exit(1);
}
if (owner.id === target.id) {
  console.error("✖ Origen y destino son el mismo usuario.");
  process.exit(1);
}

const [{ count: pending }] = await sql`
  SELECT count(*)::int AS count
  FROM books b
  WHERE b.user_id = ${owner.id}
    AND NOT EXISTS (
      SELECT 1 FROM books x
      WHERE x.user_id = ${target.id}
        AND lower(x.title) = lower(b.title)
        AND coalesce(x.authors[1], '') = coalesce(b.authors[1], '')
    )
`;

console.log(`De: ${owner.email}\nA:  ${target.email}\nLibros por copiar: ${pending}`);

if (pending === 0) {
  console.log("Nada que hacer.");
  process.exit(0);
}
if (DRY_RUN) {
  console.log("[dry-run] Nada insertado.");
  process.exit(0);
}

const copied = await sql`
  INSERT INTO books (
    user_id, google_id, isbn13, title, authors, genres,
    synopsis, cover_url, published_year, page_count, language, status
  )
  SELECT
    ${target.id}, b.google_id, b.isbn13, b.title, b.authors, b.genres,
    b.synopsis, b.cover_url, b.published_year, b.page_count, b.language, 'to_read'
  FROM books b
  WHERE b.user_id = ${owner.id}
    AND NOT EXISTS (
      SELECT 1 FROM books x
      WHERE x.user_id = ${target.id}
        AND lower(x.title) = lower(b.title)
        AND coalesce(x.authors[1], '') = coalesce(b.authors[1], '')
    )
  ON CONFLICT (user_id, google_id) DO NOTHING
  RETURNING id
`;

const [{ count: total }] = await sql`SELECT count(*)::int AS count FROM books WHERE user_id = ${target.id}`;
console.log(`✔ Copiados ${copied.length}. ${target.email} tiene ahora ${total} libros.`);
