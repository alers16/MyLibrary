import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import LoginCard from "@/components/LoginCard";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-display-lg-mobile font-bold text-primary md:text-display-lg">
          LibriBox
        </h1>
        <p className="mt-2 text-body-lg text-on-surface-variant">
          Tu santuario digital de lectura
        </p>
      </div>

      <LoginCard />

      {error && (
        <div className="mt-6 flex max-w-md items-start gap-3 rounded-sm border border-error/30 bg-error-container/40 p-4">
          <Icon name="error" className="mt-0.5 text-error" />
          <p className="text-sm text-on-error-container">
            {error === "unauthorized"
              ? "Tu cuenta de Google no está autorizada para usar esta biblioteca."
              : "No se pudo iniciar sesión. Inténtalo de nuevo."}
          </p>
        </div>
      )}

      <p className="mt-10 max-w-sm text-center text-label-sm font-medium text-on-surface-variant">
        Biblioteca personal privada. Solo las cuentas autorizadas pueden
        acceder al catálogo y al recomendador IA.
      </p>
    </div>
  );
}
