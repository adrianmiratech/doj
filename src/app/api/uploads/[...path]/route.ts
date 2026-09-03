import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

const TIPOS_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segmentos } = await params;

  // Evita salir de la carpeta de subidas (path traversal).
  if (segmentos.some((s) => s.includes("..") || s.includes("/") || s.includes("\\"))) {
    return new NextResponse("Ruta inválida", { status: 400 });
  }

  const extension = path.extname(segmentos.at(-1) ?? "").toLowerCase();
  const tipoMime = TIPOS_MIME[extension];
  if (!tipoMime) return new NextResponse("No encontrado", { status: 404 });

  const rutaArchivo = path.join(process.cwd(), "public", "uploads", ...segmentos);

  try {
    const datos = await readFile(rutaArchivo);
    return new NextResponse(new Uint8Array(datos), {
      headers: {
        "Content-Type": tipoMime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("No encontrado", { status: 404 });
  }
}
