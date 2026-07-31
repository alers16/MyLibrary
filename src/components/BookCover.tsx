import Icon from "./Icon";

type BookCoverProps = {
  src?: string | null;
  title: string;
  iconSize?: string;
};

/**
 * Portada dentro de un contenedor `relative` (ocupa todo el hueco).
 * Las portadas vienen de hosts arbitrarios (Google Books, Open Library,
 * URLs manuales), así que se usa <img> en lugar de next/image.
 */
export default function BookCover({
  src,
  title,
  iconSize = "text-[40px]",
}: BookCoverProps) {
  if (!src) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-vellum p-3 text-center text-outline">
        <Icon name="auto_stories" className={iconSize} />
        <span className="line-clamp-3 font-display text-sm font-semibold text-on-surface-variant">
          {title}
        </span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Portada de ${title}`}
      loading="lazy"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
