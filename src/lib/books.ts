import type { ReadingStatus } from "@/db/schema";

export type { BookRow as Book, ReadingStatus } from "@/db/schema";

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  to_read: "Por leer",
  reading: "Leyendo",
  finished: "Leído",
  dnf: "Abandonado",
};

export const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: "to_read", label: "Por leer" },
  { value: "reading", label: "Leyendo" },
  { value: "finished", label: "Leído" },
  { value: "dnf", label: "Abandonado" },
];

export const SORT_OPTIONS = [
  { value: "recent", label: "Recién añadidos" },
  { value: "title", label: "Título (A-Z)" },
  { value: "author", label: "Autor (A-Z)" },
  { value: "year", label: "Año de publicación" },
  { value: "rating", label: "Mi valoración" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

/** Normaliza para comparar títulos/autores: minúsculas, sin tildes ni signos. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function amazonSearchUrl(title: string, author: string): string {
  return `https://www.amazon.es/s?k=${encodeURIComponent(`${title} ${author}`)}`;
}
