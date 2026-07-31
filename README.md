# LibriBox — Tu biblioteca personal

Biblioteca digital personal full-stack: cataloga tus libros desde Google Books, organízalos por estado de lectura y recibe recomendaciones de una IA que conoce tus gustos. Interfaz basada en el diseño "Smart Personal Library" de Google Stitch (sistema de diseño *Bibliotheca Aesthetic*).

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend + Backend | **Next.js 16** (App Router, Server Actions) + React 19 + TypeScript, desplegado en **Vercel** |
| Estilos | **Tailwind CSS 4** con tokens del sistema de diseño en [src/app/globals.css](src/app/globals.css) |
| Base de datos | **Neon** (Postgres serverless) + **Drizzle ORM** ([src/db/schema.ts](src/db/schema.ts)) |
| Autenticación | **Better Auth** con Google OAuth y allowlist de emails ([src/lib/auth.ts](src/lib/auth.ts)) |
| Catálogo de libros | **Google Books API** (título, autores, sinopsis, géneros, portadas, ISBN) con fallback de portadas a Open Library |
| IA | **OpenAI** vía Vercel AI SDK (`generateObject`, salida estructurada) — [src/app/actions/recommendations.ts](src/app/actions/recommendations.ts) |

## Funcionalidades

- **Biblioteca** (`/`): grid de libros con filtros por estado (Por leer / Leyendo / Leído / Abandonado), búsqueda por título/autor, género, favoritos y ordenación — todo en la URL y filtrado en servidor.
- **Añadir libro** (`/add`): buscador con debounce contra Google Books (prioriza ediciones en español, con opción de buscar en todos los idiomas), formulario prellenado y editable, y entrada manual.
- **Ficha del libro** (`/book/[id]`): sinopsis completa, cambiar estado, valoración 1–5, favorito, notas personales y eliminación.
- **Recomendador IA** (`/recommendations`): analiza tu biblioteca y propone lecturas; marca si el libro **ya está en tu biblioteca** o es **nuevo para ti**, con botón de **compra** (Amazon) y de **añadir a "Por leer"**. La última generación se cachea en BD para no gastar cuota al revisitar.
- **Login con Google**: biblioteca privada; solo los emails de `ALLOWED_EMAILS` pueden entrar.

## Puesta en marcha

### 1. Credenciales (una sola vez)

1. **Neon** — crea un proyecto en [neon.tech](https://neon.tech) y copia la *connection string* (pooled) → `DATABASE_URL`.
2. **Google OAuth** — en [Google Cloud Console](https://console.cloud.google.com) → *APIs y servicios → Credenciales → Crear ID de cliente OAuth* (tipo "Aplicación web"):
   - Orígenes: `http://localhost:3000` y tu dominio de Vercel.
   - URIs de redirección: `http://localhost:3000/api/auth/callback/google` y `https://TU-APP.vercel.app/api/auth/callback/google`.
   - Copia `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
3. **Google Books API key** (opcional, recomendable) — en el mismo proyecto de Google Cloud habilita "Books API" y crea una API key → `GOOGLE_BOOKS_API_KEY`. Sin key también funciona, con cuota reducida.
4. **OpenAI** — crea una API key en [platform.openai.com](https://platform.openai.com) → `OPENAI_API_KEY`.

### 2. Entorno local

```bash
cp .env.example .env.local   # y rellena los valores
npm install
npm run db:push              # crea las tablas en Neon
npm run dev                  # http://localhost:3000
```

### 3. Deploy en Vercel

1. Sube el repo a GitHub e impórtalo en [vercel.com/new](https://vercel.com/new) (Next.js se detecta solo).
2. Añade en *Settings → Environment Variables* todas las variables de `.env.example` (con `BETTER_AUTH_URL` = URL de producción).
3. Añade la URI de redirección de producción en Google Cloud Console.
4. Las tablas ya existen si hiciste `npm run db:push` contra la misma base de Neon.

> Alternativa: instala la integración de **Neon** desde el Marketplace de Vercel y te inyecta `DATABASE_URL` automáticamente.

## Variables de entorno

Ver [.env.example](.env.example) — documentadas una a una. Resumen: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAILS`, `GOOGLE_BOOKS_API_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y arranque de producción |
| `npm run db:push` | Sincroniza el esquema Drizzle con Neon |
| `npm run db:studio` | Interfaz visual de la BD (Drizzle Studio) |
