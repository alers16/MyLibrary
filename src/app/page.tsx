import { requireUser } from "@/lib/session";
import {
  getLatestRecommendationRun,
  listBooks,
  listGenres,
} from "@/lib/queries";
import {
  PAGE_SIZE,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  type ReadingStatus,
  type SortOption,
} from "@/lib/books";
import AiPick from "@/components/AiPick";
import LibraryExplorer from "@/components/LibraryExplorer";

type RawSearchParams = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const statusValues = STATUS_OPTIONS.map((o) => o.value) as string[];
  const sortValues = SORT_OPTIONS.map((o) => o.value) as string[];

  const rawStatus = asString(params.estado);
  const status = statusValues.includes(rawStatus ?? "")
    ? (rawStatus as ReadingStatus)
    : undefined;

  const q = asString(params.q)?.trim() || undefined;
  const genre = asString(params.genero)?.trim() || undefined;
  const favorites = asString(params.fav) === "1";

  const rawSort = asString(params.orden) ?? "recent";
  const sort = sortValues.includes(rawSort)
    ? (rawSort as SortOption)
    : "recent";

  // Por defecto solo las 20 primeras; "Ver más" pide el resto vía ?limit=
  const rawLimit = Number(asString(params.limit));
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), PAGE_SIZE), 2000)
    : PAGE_SIZE;

  const [{ rows, total }, genres, run] = await Promise.all([
    listBooks(user.id, { status, q, genre, favorites, sort, limit }),
    listGenres(user.id),
    getLatestRecommendationRun(user.id),
  ]);

  return (
    <div className="px-4 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-[1200px]">
        <LibraryExplorer
          books={rows}
          genres={genres}
          total={total}
          aiSlot={<AiPick run={run} />}
        />
      </div>
    </div>
  );
}
