"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/session";
import Icon from "./Icon";

export default function MobileTopBar({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant/20 bg-surface px-4 lg:hidden">
      <Link
        href="/"
        className="font-display text-display-lg-mobile font-bold tracking-tight text-primary"
      >
        LibriBox
      </Link>
      {user && (
        <div className="relative">
          {/* El avatar abre un menú: cerrar sesión pide un segundo toque,
              para que un roce accidental no te eche de la app. */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menú de usuario"
            aria-expanded={menuOpen}
            className="flex items-center text-primary transition-opacity hover:opacity-80"
          >
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border border-primary-container/30 object-cover"
              />
            ) : (
              <Icon name="account_circle" className="text-[28px]" />
            )}
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute top-11 right-0 z-50 w-56 rounded-xl border border-outline-variant/40 bg-surface p-2 shadow-lg">
                <div className="border-b border-outline-variant/30 px-3 pt-1 pb-2">
                  <p className="truncate text-sm font-semibold text-on-surface">
                    {user.name}
                  </p>
                  <p className="truncate text-label-sm font-medium text-on-surface-variant">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-1 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-error"
                >
                  <Icon name="logout" className="text-[18px]" />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
