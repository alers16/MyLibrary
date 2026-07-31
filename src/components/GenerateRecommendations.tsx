"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { generateRecommendations } from "@/app/actions/recommendations";
import Icon from "./Icon";

type Props = {
  bookCount: number;
  aiConfigured: boolean;
  hasRun: boolean;
};

export default function GenerateRecommendations({
  bookCount,
  aiConfigured,
  hasRun,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const tooFewBooks = bookCount < 3;
  const disabled = pending || tooFewBooks || !aiConfigured;

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateRecommendations();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {!aiConfigured && (
        <div className="flex items-start gap-3 rounded-sm border border-tertiary/30 bg-tertiary-fixed/20 p-4">
          <Icon name="key" className="mt-0.5 text-tertiary" />
          <p className="text-sm text-on-surface-variant">
            El recomendador necesita una API key de OpenAI. Añade{" "}
            <code className="font-mono text-on-surface">OPENAI_API_KEY</code> en{" "}
            <code className="font-mono text-on-surface">.env.local</code> (o en
            las variables de entorno de Vercel) y reinicia la app.
          </p>
        </div>
      )}

      {tooFewBooks && aiConfigured && (
        <div className="flex items-start gap-3 rounded-sm border border-tertiary/30 bg-tertiary-fixed/20 p-4">
          <Icon name="info" className="mt-0.5 text-tertiary" />
          <p className="text-sm text-on-surface-variant">
            La IA necesita conocerte un poco: añade al menos 3 libros a tu
            biblioteca.{" "}
            <Link
              href="/add"
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              Añadir libros
            </Link>
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-sm border border-error/30 bg-error-container/40 p-4">
          <Icon name="error" className="mt-0.5 text-error" />
          <p className="text-sm text-on-error-container">{error}</p>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={handleGenerate}
        className="inline-flex items-center gap-2 rounded-sm bg-primary-container px-6 py-3 text-label-md font-semibold tracking-wider text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Icon
          name={pending ? "progress_activity" : "auto_awesome"}
          className={`text-[18px] ${pending ? "animate-spin" : ""}`}
        />
        {pending
          ? "La IA está leyendo tu biblioteca…"
          : hasRun
            ? "Regenerar recomendaciones"
            : "Generar recomendaciones"}
      </button>
      {pending && (
        <p className="text-sm text-on-surface-variant">
          Esto puede tardar unos segundos: analizamos tus gustos y buscamos las
          portadas.
        </p>
      )}
    </div>
  );
}
