"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/session";
import Sidebar from "./Sidebar";
import MobileTopBar from "./MobileTopBar";
import BottomNav from "./BottomNav";

export default function AppShell({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <>
      <MobileTopBar user={user} />
      <Sidebar user={user} />
      <main className="min-h-screen pt-16 pb-24 lg:ml-64 lg:pt-0 lg:pb-0">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
