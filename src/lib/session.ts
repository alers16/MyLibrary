import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, isEmailAllowed } from "./auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

/** Devuelve el usuario autenticado o null (sin redirigir). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  if (!isEmailAllowed(session.user.email)) return null;
  return session.user;
}

/** Exige sesión: redirige a /login si no la hay. Para páginas y server actions. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
