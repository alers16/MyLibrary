import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getVolume, searchVolumes } from "@/lib/google-books";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;

  try {
    const id = params.get("id");
    if (id) {
      const book = await getVolume(id);
      return NextResponse.json({ book });
    }

    const query = params.get("q")?.trim() ?? "";
    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }
    const allLanguages = params.get("all") === "1";
    const results = await searchVolumes(query, allLanguages);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "No se pudo consultar el catálogo. Inténtalo de nuevo." },
      { status: 502 },
    );
  }
}
