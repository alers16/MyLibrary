import {
  PAGE_SIZE,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  type ReadingStatus,
  type SortOption,
} from "./books";
import type { LibraryFilters } from "./queries";

export type RawSearchParams = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Traduce los searchParams (en español, tal y como viven en la URL) a los
 * filtros SQL. Lo usan el dashboard y la ficha (para anterior/siguiente),
 * así que ambos deben interpretar la URL exactamente igual.
 */
export function parseLibraryFilters(params: RawSearchParams): LibraryFilters {
  const statusValues = STATUS_OPTIONS.map((o) => o.value) as string[];
  const sortValues = SORT_OPTIONS.map((o) => o.value) as string[];

  const rawStatus = asString(params.estado);
  const status = statusValues.includes(rawStatus ?? "")
    ? (rawStatus as ReadingStatus)
    : undefined;

  const rawSort = asString(params.orden) ?? "recent";
  const sort = sortValues.includes(rawSort) ? (rawSort as SortOption) : "recent";

  const rawLimit = Number(asString(params.limit));
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), PAGE_SIZE), 2000)
    : PAGE_SIZE;

  const rawRating = Number(asString(params.nota));
  const minRating =
    Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 5
      ? rawRating
      : undefined;

  return {
    status,
    q: asString(params.q)?.trim() || undefined,
    genre: asString(params.genero)?.trim() || undefined,
    favorites: asString(params.fav) === "1",
    minRating,
    language: asString(params.idioma)?.trim() || undefined,
    noCover: asString(params.sinportada) === "1",
    sort,
    limit,
  };
}
