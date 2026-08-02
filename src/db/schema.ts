import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* ── Tablas de Better Auth ─────────────────────────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ── Biblioteca ────────────────────────────────────────────────────── */

export const readingStatusEnum = pgEnum("reading_status", [
  "to_read",
  "reading",
  "finished",
  "dnf",
]);

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    googleId: text("google_id"),
    isbn13: varchar("isbn13", { length: 13 }),
    title: text("title").notNull(),
    authors: text("authors")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    genres: text("genres")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    synopsis: text("synopsis"),
    coverUrl: text("cover_url"),
    publishedYear: integer("published_year"),
    pageCount: integer("page_count"),
    language: varchar("language", { length: 8 }),
    status: readingStatusEnum("status").notNull().default("to_read"),
    rating: smallint("rating"),
    favorite: boolean("favorite").notNull().default(false),
    notes: text("notes"),
    /* Progreso de lectura: se rellenan solos al cambiar de estado. */
    currentPage: integer("current_page"),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("books_user_status_idx").on(t.userId, t.status),
    uniqueIndex("books_user_google_idx").on(t.userId, t.googleId),
  ],
);

export type BookRow = typeof books.$inferSelect;
export type NewBookRow = typeof books.$inferInsert;
export type ReadingStatus = (typeof readingStatusEnum.enumValues)[number];

/* ── Caché de recomendaciones IA ───────────────────────────────────── */

export type RecommendationItem = {
  title: string;
  author: string;
  reason: string;
  affinity: number;
  owned: boolean;
  bookId?: string;
  googleId?: string;
  isbn13?: string;
  coverUrl?: string;
  buyUrl: string;
  /** "No me interesa": se oculta y se veta en las siguientes generaciones. */
  dismissed?: boolean;
};

export const recommendationRuns = pgTable("recommendation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  items: jsonb("items").$type<RecommendationItem[]>().notNull(),
  model: text("model"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RecommendationRun = typeof recommendationRuns.$inferSelect;
