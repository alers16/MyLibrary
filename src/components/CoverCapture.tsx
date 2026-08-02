"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadCoverPhoto } from "@/app/actions/books";
import Icon from "./Icon";

/** Lado mayor de la foto ya comprimida (las portadas son 2:3 aprox.). */
const MAX_SIDE = 900;
const JPEG_QUALITY = 0.78;

/**
 * "Hacer una foto a la portada": en el móvil abre la cámara directamente
 * (capture=environment); en escritorio, el selector de archivos. La imagen
 * se reduce y comprime en el navegador antes de subirse a la BD.
 */
export default function CoverCapture({
  bookId,
  hasCover,
}: {
  bookId: string;
  hasCover: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, startSaving] = useTransition();

  async function compress(file: File): Promise<string> {
    // `imageOrientation` aplica la rotación EXIF: las fotos de móvil en
    // vertical llegan giradas si no se corrige aquí.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    try {
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(bitmap, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    } finally {
      bitmap.close();
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      setPreview(await compress(file));
    } catch {
      setError("No se pudo procesar la imagen. Prueba con otra foto.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function save() {
    if (!preview || saving) return;
    setError(null);
    startSaving(async () => {
      const result = await uploadCoverPhoto(bookId, preview);
      if (result.ok) {
        setPreview(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mt-3 space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {preview ? (
        <div className="vellum-card space-y-3 rounded-xl p-3">
          <div className="relative mx-auto aspect-[2/3] w-40 overflow-hidden rounded-xs shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Vista previa de la portada"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary-container px-4 py-1.5 text-label-md font-semibold tracking-wider text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Icon name="save" className="text-[16px]" />
              {saving ? "Guardando…" : "Usar esta foto"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => inputRef.current?.click()}
              className="rounded-sm border border-outline-variant px-3 py-1.5 text-label-md font-semibold tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              Repetir
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setPreview(null)}
              aria-label="Descartar la foto"
              className="rounded-sm px-2 py-1.5 text-on-surface-variant transition-colors hover:text-error"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={processing}
          onClick={() => inputRef.current?.click()}
          className={`flex w-full items-center justify-center gap-2 rounded-sm px-4 py-2 text-label-md font-semibold tracking-wider transition-colors disabled:opacity-60 ${
            hasCover
              ? "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
              : "border border-primary text-primary hover:bg-primary-container hover:text-on-primary"
          }`}
        >
          <Icon name="photo_camera" className="text-[18px]" />
          {processing
            ? "Procesando…"
            : hasCover
              ? "Cambiar portada con una foto"
              : "Hacer una foto a la portada"}
        </button>
      )}

      {error && (
        <p className="text-center text-sm text-error">{error}</p>
      )}
    </div>
  );
}
