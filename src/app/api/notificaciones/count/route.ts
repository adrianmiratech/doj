import { NextResponse } from "next/server";
import { contarNotificacionesNoLeidas } from "@/lib/actions/notificaciones";

export async function GET() {
  const count = await contarNotificacionesNoLeidas();
  return NextResponse.json({ count });
}
