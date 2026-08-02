import { requireUser } from "@/lib/session";
import {
  countByStatus,
  getLatestRecommendationRun,
  listBooks,
  listGenres,
  listLanguages,
} from "@/lib/queries";
import { parseLibraryFilters, type RawSearchParams } from "@/lib/filters";
import AiPick from "@/components/AiPick";
import LibraryExplorer from "@/components/LibraryExplorer";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await requireUser();
  const filters = parseLibraryFilters(await searchParams);

  const [{ rows, total }, genres, languages, statusCounts, run] =
    await Promise.all([
      listBooks(user.id, filters),
      listGenres(user.id),
      listLanguages(user.id),
      countByStatus(user.id),
      getLatestRecommendationRun(user.id),
    ]);

  return (
    <div className="px-4 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-[1200px]">
        <LibraryExplorer
          books={rows}
          genres={genres}
          languages={languages}
          statusCounts={statusCounts}
          total={total}
          aiSlot={<AiPick run={run} />}
        />
      </div>
    </div>
  );
}
