import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getLibraryStats } from "@/lib/queries";
import { STATUS_LABELS } from "@/lib/books";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "Estadísticas",
};

const nf = new Intl.NumberFormat("es-ES");

/* Colores de marca validados contra el fondo (≥3:1). Cada gráfico usa un
   solo tono: la identidad la dan las etiquetas de texto, nunca el color. */
const GREEN = "var(--color-primary-container)";
const GOLD = "var(--color-tertiary)";

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1)
    .toLocaleDateString("es-ES", { month: "short" })
    .replace(".", "");
}

/** Últimos 12 meses (clave YYYY-MM), el actual incluido. */
function lastMonths(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function StatTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: string;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="vellum-card rounded-xl p-5">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Icon name={icon} className="text-[18px]" />
        <p className="text-label-md font-semibold tracking-wider">{label}</p>
      </div>
      <p className="mt-2 font-display text-headline-md font-semibold text-on-surface">
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-label-sm text-on-surface-variant">{detail}</p>
      )}
    </div>
  );
}

function BarList({
  items,
  color,
  href,
}: {
  items: { label: string; value: number; suffix?: string }[];
  color: string;
  href?: (label: string) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} title={`${item.label}: ${nf.format(item.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            {href ? (
              <Link
                href={href(item.label)}
                className="truncate text-sm text-on-surface hover:text-primary hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate text-sm text-on-surface">
                {item.label}
              </span>
            )}
            <span className="shrink-0 text-label-md font-semibold text-on-surface-variant">
              {nf.format(item.value)}
              {item.suffix ?? ""}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-outline-variant/25">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MonthColumns({
  data,
  color,
  emptyText,
}: {
  data: { month: string; total: number }[];
  color: string;
  emptyText: string;
}) {
  const months = lastMonths(12);
  const byMonth = new Map(data.map((d) => [d.month, d.total]));
  const values = months.map((m) => byMonth.get(m) ?? 0);
  const max = Math.max(...values);

  if (max === 0) {
    return <p className="py-8 text-center text-sm text-on-surface-variant">{emptyText}</p>;
  }

  return (
    <div className="flex items-end gap-1.5" style={{ height: "8.5rem" }}>
      {months.map((month, i) => {
        const value = values[i];
        const isMax = value === max;
        return (
          <div
            key={month}
            title={`${monthLabel(month)}: ${nf.format(value)}`}
            className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            {isMax && (
              <span className="text-label-sm font-semibold text-on-surface-variant">
                {nf.format(value)}
              </span>
            )}
            <div
              className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-80"
              style={{
                height: `${max > 0 ? Math.max(value > 0 ? 4 : 0, (value / max) * 88) : 0}px`,
                backgroundColor: color,
              }}
            />
            <span className="text-[10px] text-on-surface-variant">
              {monthLabel(month)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="vellum-card rounded-xl p-6">
      <h2 className="mb-5 font-display text-headline-sm font-semibold text-on-surface">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function StatsPage() {
  const user = await requireUser();
  const stats = await getLibraryStats(user.id);

  const statusItems = (
    ["finished", "reading", "to_read", "dnf"] as const
  ).map((status) => ({
    label: STATUS_LABELS[status],
    value: stats.byStatus[status],
  }));

  const ratingItems = [5, 4, 3, 2, 1].map((rating) => ({
    label: "★".repeat(rating),
    value:
      stats.ratingDistribution.find((r) => r.rating === rating)?.total ?? 0,
  }));
  const hasRatings = stats.ratingDistribution.length > 0;

  return (
    <div className="px-4 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-[1100px] space-y-8">
        <header className="space-y-1 border-b border-outline-variant/20 pb-6">
          <h1 className="font-display text-headline-md font-semibold text-on-surface">
            Estadísticas
          </h1>
          <p className="text-on-surface-variant">
            Tu biblioteca en números.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            icon="library_books"
            label="Libros"
            value={nf.format(stats.total)}
            detail={`${nf.format(stats.favorites)} favoritos`}
          />
          <StatTile
            icon="task_alt"
            label="Leídos"
            value={nf.format(stats.byStatus.finished)}
            detail={
              stats.total > 0
                ? `el ${Math.round((stats.byStatus.finished / stats.total) * 100)} % de la biblioteca`
                : undefined
            }
          />
          <StatTile
            icon="auto_stories"
            label="Páginas leídas"
            value={nf.format(stats.pagesRead)}
            detail={`de ${nf.format(stats.pagesTotal)} en total`}
          />
          <StatTile
            icon="star"
            label="Nota media"
            value={
              stats.avgRating !== null
                ? stats.avgRating.toLocaleString("es-ES", {
                    maximumFractionDigits: 1,
                  })
                : "—"
            }
            detail={
              stats.avgRating !== null
                ? `sobre ${nf.format(
                    stats.ratingDistribution.reduce((a, r) => a + r.total, 0),
                  )} valoraciones`
                : "aún sin valoraciones"
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Estado de la biblioteca">
            <BarList
              items={statusItems}
              color={GREEN}
              href={(label) => {
                const status = Object.entries(STATUS_LABELS).find(
                  ([, l]) => l === label,
                )?.[0];
                return status ? `/?estado=${status}` : "/";
              }}
            />
          </ChartCard>

          <ChartCard title="Mis valoraciones">
            {hasRatings ? (
              <BarList
                items={ratingItems.filter((item) => item.value > 0)}
                color={GOLD}
              />
            ) : (
              <p className="py-8 text-center text-sm text-on-surface-variant">
                Valora tus libros con estrellas y aquí verás cómo se reparten.
              </p>
            )}
          </ChartCard>

          <ChartCard title="Géneros más frecuentes">
            <BarList
              items={stats.topGenres.map((g) => ({
                label: g.genre,
                value: g.total,
              }))}
              color={GREEN}
              href={(label) => `/?genero=${encodeURIComponent(label)}`}
            />
          </ChartCard>

          <ChartCard title="Autores más frecuentes">
            <BarList
              items={stats.topAuthors.map((a) => ({
                label: a.author,
                value: a.total,
              }))}
              color={GREEN}
              href={(label) => `/?q=${encodeURIComponent(label)}`}
            />
          </ChartCard>

          <ChartCard title="Añadidos por mes">
            <MonthColumns
              data={stats.addedByMonth}
              color={GREEN}
              emptyText="Nada añadido en los últimos 12 meses."
            />
          </ChartCard>

          <ChartCard title="Terminados por mes">
            <MonthColumns
              data={stats.finishedByMonth}
              color={GOLD}
              emptyText="Marca libros como «Leído» y aquí verás tu ritmo de lectura."
            />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
