/** Bloque de esqueleto con el pulso de carga; compón el layout con className. */
export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-sm bg-outline-variant/25 ${className}`}
    />
  );
}
