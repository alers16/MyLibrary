# LibriBox — Contexto del proyecto

> Documento de traspaso completo. Última actualización: 2026-07-31.

## Qué es

Biblioteca digital personal full-stack ("LibriBox"). Nació como conversión a código del diseño **"Smart Personal Library"** hecho en Google Stitch (proyecto Stitch ID `9969682885587166398`, accesible vía MCP de Stitch) y el mismo día se convirtió en app completa. **Toda la UI está en español** (decisión del usuario). El usuario es hispanohablante (España, enlaces de compra a amazon.es) y su email es `alerosan16@gmail.com`.

## Stack (todo decidido y aprobado en plan)

| Capa | Tecnología | Archivo clave |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript | — |
| Estilos | Tailwind CSS 4; sistema de diseño "Bibliotheca Aesthetic" (verde bosque #2d5a27, papel #FDFCF0, vellum #F7F5E6, dorado #D4AF37, Playfair Display + Source Sans 3) como tokens `@theme` | `src/app/globals.css` |
| BD | Neon (Postgres serverless) + Drizzle ORM, driver neon-http | `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts` |
| Auth | Better Auth + Google OAuth + allowlist `ALLOWED_EMAILS` | `src/lib/auth.ts`, `src/lib/session.ts`, `src/app/api/auth/[...all]/route.ts` |
| Catálogo | Google Books API v1 (gratuita; key opcional recomendada). Fallback de portadas: Open Library por ISBN | `src/lib/google-books.ts`, `src/app/api/books/search/route.ts` |
| IA | OpenAI vía Vercel AI SDK (`ai@7` + `@ai-sdk/openai@4`), `generateObject` con zod, modelo por env (`OPENAI_MODEL`, default `gpt-5-mini`) | `src/app/actions/recommendations.ts` |
| Deploy objetivo | Vercel (frontend+backend) + Neon (BD) | — |

## Rutas y funcionalidades

- `/` — Dashboard: grid de libros con filtros **en la URL y resueltos en SQL**: estado (`?estado=`), texto título/autor (`?q=`), género (`?genero=`), favoritos (`?fav=1`), orden (`?orden=` recent|title|author|year|rating), paginación (`?limit=`). Estrella de favorito en tarjeta. Muestra la mejor recomendación IA cacheada (`AiPick`).
- `/add` — Buscador con debounce contra `/api/books/search` (proxy autenticado que oculta la key; `langRestrict=es` por defecto + checkbox "todos los idiomas"), selección → formulario prellenado editable, entrada manual, detección de duplicados por `(userId, googleId)`.
- `/book/[id]` — Ficha: sinopsis, metadatos, cambiar estado, valoración 1–5 estrellas, favorito, notas, eliminar con confirmación (`BookEditor`).
- `/recommendations` — Genera 6 recomendaciones con OpenAI a partir de la biblioteca (géneros, valoraciones, favoritos). Cada una marcada **"En tu biblioteca"** (link a ficha) o **"Nuevo para ti"** (botón Comprar → amazon.es + botón "Añadir a Por leer"). Resultado cacheado en `recommendation_runs`; se muestra la última generación con fecha y botón regenerar.
- `/login` — Login con Google; página sin shell (el `AppShell` la excluye por pathname).

## Esquema BD (Drizzle, `src/db/schema.ts`)

- Tablas Better Auth: `user`, `session`, `account`, `verification` (escritas a mano según el esquema estándar de Better Auth).
- `books`: uuid PK, userId FK, googleId, isbn13, title, `authors text[]`, `genres text[]`, synopsis, coverUrl, publishedYear, pageCount, language, `status` enum (`to_read|reading|finished|dnf`), rating smallint, favorite bool, notes, addedAt, updatedAt. Índice `(userId,status)`, unique `(userId,googleId)`.
- `recommendation_runs`: items jsonb (`RecommendationItem[]`: title, author, reason, affinity, owned, bookId?, googleId?, isbn13?, coverUrl?, buyUrl), model, createdAt.

## Decisiones no obvias (gotchas)

1. **`drizzle-orm` debe ser ≥0.45.2**: peer dependency de `better-auth@1.6+`. Con 0.44 el `npm install` falla con ERESOLVE (ya pasó y se corrigió).
2. **Portadas con `<img>` plano, NO `next/image`**: vienen de hosts arbitrarios (books.google.com, covers.openlibrary.org, URLs manuales). Componente `BookCover` con placeholder si no hay portada. El `images.remotePatterns` de `next.config.ts` quedó de la fase anterior y ya no se usa (inofensivo).
3. **AI SDK v7**: `generateObject({ model: openai(name), schema, prompt })` — la API tipa correctamente con `ai@7` + `@ai-sdk/openai@4`. No bajar a v5 sin revisar.
4. Las **actions devuelven `{ok:boolean; error?}`**; para `<form action>` de server components hay wrapper `addRecommendationAction` que devuelve `void` (los form actions no admiten valor de retorno).
5. **Allowlist**: `isEmailAllowed()` se aplica en el hook de creación de usuario de Better Auth Y en `getSessionUser()`. Si `ALLOWED_EMAILS` está vacío, entra cualquiera con Google.
6. `.env.local` existe con **placeholders** (gitignored); `.env.example` documenta todo. El build funciona con placeholders porque nada toca la BD en build (todas las rutas son dinámicas por sesión).
7. Los géneros de Google Books ("Fiction / Thrillers") se separan por `/` y se deduplican al guardar. El filtro de género del dashboard se puebla con `SELECT DISTINCT unnest(genres)`.
8. Estados en BD con guion bajo (`to_read`), labels en español en `src/lib/books.ts` (`STATUS_LABELS`).
9. El matching "¿ya tengo este libro?" de las recomendaciones usa `normalizeText` (minúsculas, sin tildes) comparando título + solapamiento de tokens de autor (`findOwned` en actions/recommendations.ts).

## Estado actual

- ✅ `npm run build` **en verde** (Next 16.2.12, 8 rutas, todas dinámicas).
- ✅ Todo el código de la app implementado y UI 100 % en español.
- ❌ **Sin credenciales reales**: `.env.local` tiene placeholders. Sin ellas el login/búsqueda/IA no funcionan en runtime.
- ❌ **No se ha ejecutado `npm run db:push`** (necesita `DATABASE_URL` real de Neon).
- ❌ **No es repositorio git** todavía, ni está desplegado en Vercel.
- ❌ Sin probar end-to-end con datos reales (bloqueado por credenciales).

## Pasos pendientes (en orden)

1. Usuario crea proyecto en [neon.tech](https://neon.tech) → pegar `DATABASE_URL` en `.env.local`.
2. Usuario crea OAuth Client en Google Cloud Console (redirect: `http://localhost:3000/api/auth/callback/google`) → `GOOGLE_CLIENT_ID/SECRET`. Opcional: habilitar Books API y crear `GOOGLE_BOOKS_API_KEY`.
3. Usuario crea `OPENAI_API_KEY` en platform.openai.com.
4. Generar `BETTER_AUTH_SECRET` real (`npx @better-auth/cli secret` u `openssl rand -base64 32`).
5. `npm run db:push` → crea tablas en Neon.
6. `npm run dev` → probar flujo completo: login → buscar y añadir libro → filtros → ficha (estado/valoración/notas) → generar recomendaciones → comprobar owned/no-owned + compra + añadir a por leer.
7. `git init` + commit + repo GitHub → importar en Vercel → variables de entorno de producción (con `BETTER_AUTH_URL` = URL de Vercel) → añadir redirect URI de producción en Google Cloud.

## Comandos

```bash
npm run dev        # desarrollo (localhost:3000)
npm run build      # build de producción
npm run db:push    # sincroniza esquema Drizzle → Neon (lee .env.local vía dotenv en drizzle.config.ts)
npm run db:studio  # Drizzle Studio (inspector visual de la BD)
```

## Historia del proyecto

1. **Fase 1** (misma sesión): conversión fiel del diseño Stitch (4 pantallas: dashboard desktop/mobile, añadir libro, recomendador) a Next.js estático con datos semilla. Textos en inglés.
2. **Fase 2** (plan aprobado por el usuario): full-stack con las decisiones de arriba. El usuario eligió explícitamente: **login con Google** (frente a contraseña simple o sin login) y **todo en español** con búsqueda priorizando ediciones en español (`langRestrict=es` + toggle de escape).
