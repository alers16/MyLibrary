"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/session";
import Icon from "./Icon";

export default function MobileTopBar({ user }: { user: SessionUser | null }) {
  const router = useRouter();

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
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Cerrar sesión"
          className="flex items-center gap-2 text-primary transition-opacity hover:opacity-80"
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
          <Icon name="logout" className="text-[20px]" />
        </button>
      )}
    </header>
  );
}
