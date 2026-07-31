import Link from "next/link";
import type { RecommendationItem } from "@/db/schema";
import { addRecommendationAction } from "@/app/actions/recommendations";
import BookCover from "./BookCover";
import Icon from "./Icon";

type Props = {
  item: RecommendationItem;
  runId: string;
  index: number;
  featured?: boolean;
};

function OwnershipBadge({ owned }: { owned: boolean }) {
  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full border border-outline-variant bg-surface/90 px-3 py-1 shadow-sm backdrop-blur-sm">
      <Icon
        name={owned ? "bookmark_added" : "new_releases"}
        className={`text-[14px] ${owned ? "text-primary" : "text-tertiary"}`}
      />
      <span
        className={`text-label-sm font-medium tracking-wider uppercase ${owned ? "text-primary" : "text-tertiary"}`}
      >
        {owned ? "En tu biblioteca" : "Nuevo para ti"}
      </span>
    </div>
  );
}

function CardActions({ item, runId, index }: Omit<Props, "featured">) {
  if (item.owned && item.bookId) {
    return (
      <Link
        href={`/book/${item.bookId}`}
        className="inline-flex items-center gap-2 rounded-sm bg-primary-container px-5 py-2 text-label-md font-semibold tracking-wider text-on-primary transition-opacity hover:opacity-90"
      >
        <Icon name="menu_book" className="text-[18px]" />
        Ver en mi biblioteca
      </Link>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={item.buyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-sm bg-primary-container px-5 py-2 text-label-md font-semibold tracking-wider text-on-primary transition-opacity hover:opacity-90"
      >
        <Icon name="shopping_cart" className="text-[18px]" />
        Comprar
      </a>
      <form action={addRecommendationAction.bind(null, runId, index)}>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-sm border border-primary px-5 py-2 text-label-md font-semibold tracking-wider text-primary transition-colors hover:bg-primary-container hover:text-on-primary"
        >
          <Icon name="add_box" className="text-[18px]" />
          Añadir a Por leer
        </button>
      </form>
    </div>
  );
}

export default function RecommendationCard({
  item,
  runId,
  index,
  featured = false,
}: Props) {
  if (featured) {
    return (
      <article className="ai-border ai-glow group relative flex flex-col overflow-hidden rounded-xl md:col-span-8 md:flex-row">
        <div className="relative h-64 w-full shrink-0 overflow-hidden md:h-auto md:w-2/5">
          <BookCover src={item.coverUrl} title={item.title} iconSize="text-[56px]" />
          <OwnershipBadge owned={item.owned} />
        </div>
        <div className="flex w-full flex-col justify-between p-6 md:p-8">
          <div>
            <div className="mb-2 flex items-center gap-2 text-tertiary-container">
              <Icon name="auto_awesome" filled className="text-[18px]" />
              <span className="text-label-md font-semibold tracking-wider uppercase">
                Afinidad {item.affinity}%
              </span>
            </div>
            <h2 className="mb-1 font-display text-headline-md font-semibold text-on-background">
              {item.title}
            </h2>
            <p className="mb-6 text-secondary">{item.author}</p>
            <div className="relative rounded-sm border border-outline-variant/30 bg-surface-container-low p-4">
              <Icon
                name="format_quote"
                className="absolute -top-3 -left-2 rounded-full bg-paper text-[32px] text-tertiary-container/30"
              />
              <p className="relative z-10 text-on-surface-variant italic">
                {item.reason}
              </p>
            </div>
          </div>
          <div className="mt-8">
            <CardActions item={item} runId={runId} index={index} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="vellum-card group flex flex-col overflow-hidden rounded-xl transition-shadow duration-300 hover:shadow-lg md:col-span-4">
      <div className="relative h-48 shrink-0 overflow-hidden bg-surface-container">
        <BookCover src={item.coverUrl} title={item.title} />
        <OwnershipBadge owned={item.owned} />
      </div>
      <div className="flex flex-grow flex-col p-5">
        <div className="mb-2 flex items-center gap-1.5 text-tertiary-container">
          <Icon name="auto_awesome" filled className="text-[16px]" />
          <span className="text-label-sm font-medium tracking-wider uppercase">
            Afinidad {item.affinity}%
          </span>
        </div>
        <h2 className="line-clamp-2 mb-1 font-display text-headline-sm font-semibold text-on-background">
          {item.title}
        </h2>
        <p className="mb-4 text-sm text-secondary">{item.author}</p>
        <p className="mb-6 flex-grow border-l-2 border-tertiary-container/40 pl-3 text-sm text-on-surface-variant">
          {item.reason}
        </p>
        <CardActions item={item} runId={runId} index={index} />
      </div>
    </article>
  );
}
