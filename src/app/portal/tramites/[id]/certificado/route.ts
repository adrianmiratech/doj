import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("No autorizado", { status: 401 });

  const { id } = await params;
  const tramite = await prisma.tramite.findUnique({ where: { id } });
  if (!tramite || tramite.ciudadanoId !== session.user.id || !tramite.certificadoPdf) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  return new NextResponse(new Uint8Array(tramite.certificadoPdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-antecedentes.pdf"`,
    },
  });
}
