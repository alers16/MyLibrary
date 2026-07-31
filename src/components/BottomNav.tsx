"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const NAV_ITEMS = [
  { href: "/", label: "Biblioteca", icon: "library_books" },
  { href: "/recommendations", label: "IA", icon: "auto_awesome" },
  { href: "/add", label: "Añadir", icon: "add_box" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación inferior"
      className="pb-safe fixed inset-x-0 bottom-0 z-50 flex min-h-16 items-center justify-around border-t border-outline-variant/20 bg-surface px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center justify-center rounded-sm px-4 py-1 transition-transform ${
              active
                ? "scale-90 font-bold text-primary"
                : "text-on-surface-variant active:bg-surface-container-high"
            }`}
          >
            <Icon name={item.icon} filled={active} className="text-[24px]" />
            <span className="mt-1 text-label-sm font-medium">{item.label}</span>
            {active && (
              <span className="absolute -top-1 h-1 w-1 rounded-full bg-tertiary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
