import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { copySharedLibrary } from "./library-seed";

export function isEmailAllowed(email: string | null | undefined): boolean {
  const allowlist = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return true;
  return !!email && allowlist.includes(email.toLowerCase());
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          if (!isEmailAllowed(newUser.email)) {
            throw new APIError("FORBIDDEN", {
              message: "Este email no está autorizado para usar LibriBox.",
            });
          }
        },
        // Los usuarios nuevos heredan la biblioteca compartida (misma casa,
        // mismos libros físicos), cada uno con su propio estado de lectura.
        after: async (newUser) => {
          try {
            const copied = await copySharedLibrary(newUser.id, newUser.email);
            if (copied > 0) {
              console.log(`[LibriBox] ${copied} libros copiados a ${newUser.email}`);
            }
          } catch (error) {
            // Un fallo aquí no debe impedir el registro: la biblioteca se puede
            // clonar después con `node scripts/copy-library.mjs`.
            console.error("[LibriBox] No se pudo clonar la biblioteca:", error);
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});
