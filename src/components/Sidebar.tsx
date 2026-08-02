"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/session";
import Icon from "./Icon";

const NAV_ITEMS = [
  { href: "/", label: "Mi biblioteca", icon: "library_books" },
  { href: "/stats", label: "Estadísticas", icon: "bar_chart" },
  { href: "/recommendations", label: "Recomendador IA", icon: "auto_awesome" },
  { href: "/add", label: "Añadir libro", icon: "add_circle" },
];

export default function Sidebar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed top-0 left-0 z-40 hidden h-screen w-64 flex-col border-r border-outline-variant/30 bg-surface-container-low p-6 lg:flex">
      <div className="mb-6">
        <p className="font-display text-headline-sm font-semibold text-primary">
          LibriBox
        </p>
        <p className="text-label-sm font-medium text-on-surface-variant">
          Tu santuario digital
        </p>
      </div>

      <Link
        href="/add"
        className="mb-6 flex w-full items-center justify-center gap-1 rounded-sm bg-primary-container px-6 py-3 text-label-md font-semibold tracking-wider text-on-primary transition-opacity hover:opacity-90"
      >
        <Icon name="add" className="text-[18px]" />
        Añadir libro
      </Link>

      <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-sm px-3 py-3 transition-all ${
                active
                  ? "bg-primary-container/10 font-bold text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <Icon
                name={item.icon}
                filled={active}
                className={`text-[20px] ${active ? "" : "transition-colors group-hover:text-primary"}`}
              />
              <span>{item.label}</span>
              {active && (
                <span className="absolute top-1/2 left-0 h-1/2 w-1 -translate-y-1/2 rounded-r-full bg-tertiary" />
              )}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="mt-auto border-t border-outline-variant/30 pt-4">
          <div className="flex items-center gap-3 px-1">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-primary-container/20 bg-secondary-container">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center font-display font-semibold text-on-secondary-container">
                  {user.name?.charAt(0) ?? "?"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface">
                {user.name}
              </p>
              <p className="truncate text-label-sm font-medium text-on-surface-variant">
                {user.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-error"
          >
            <Icon name="logout" className="text-[18px]" />
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  );
}
