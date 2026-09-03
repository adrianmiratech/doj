import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ROLE_LABELS } from "@/lib/labels";
import { generarDocumentoOficialPdf } from "@/lib/documento-oficial-pdf";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "JUEZ_SUPREMO") {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const formData = await req.formData();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!titulo || !contenido) return new NextResponse("Faltan datos", { status: 400 });

  const numeroReferencia = `DOJ-${Date.now().toString(36).toUpperCase()}`;
  const pdf = await generarDocumentoOficialPdf({
    titulo,
    contenido,
    firmante: `${session.user.nombre} ${session.user.apellidos}`,
    rangoFirmante: ROLE_LABELS[session.user.role] ?? session.user.role,
    fecha: new Date(),
    numeroReferencia,
  });

  const nombreArchivo = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo || "documento"}.pdf"`,
    },
  });
}
