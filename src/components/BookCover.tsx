"use client";

import { useState } from "react";
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
 *
 * Si no hay URL, o si la imagen no llega a cargar (Open Library responde 200
 * con un cuerpo vacío cuando no tiene esa portada), se muestra el título.
 */
export default function BookCover({
  src,
  title,
  iconSize = "text-[40px]",
}: BookCoverProps) {
  // Guardamos la URL que falló, no un booleano: así, si React reutiliza este
  // componente para otro libro, el fallo del anterior no se hereda.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
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
      decoding="async"
      onError={() => setFailedSrc(src)}
      // Open Library devuelve un GIF transparente de 1x1 cuando no tiene la
      // portada: carga sin error, así que hay que mirar el tamaño real.
      onLoad={(event) => {
        const img = event.currentTarget;
        if (img.naturalWidth <= 2 || img.naturalHeight <= 2) setFailedSrc(src);
      }}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
