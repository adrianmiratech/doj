import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { marcarConversacionLeida, eliminarMensaje, expulsarDelGrupo } from "@/lib/actions/mensajeria";
import { AutoRefresh } from "@/components/auto-refresh";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { EnviarMensajeForm } from "@/components/enviar-mensaje-form";
import { Avatar } from "@/components/avatar";
import { X } from "lucide-react";

export default async function ConversacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user;
  const esAdmin = user.role === "JUEZ_SUPREMO";

  const participa = await prisma.conversacionParticipante.findUnique({
    where: { conversacionId_userId: { conversacionId: id, userId: user.id } },
  });
  if (!participa) redirect("/dashboard/mensajeria");

  await marcarConversacionLeida(id);

  const conversacion = await prisma.conversacion.findUniqueOrThrow({
    where: { id },
    include: {
      participantes: { include: { user: true } },
      mensajes: { orderBy: { createdAt: "asc" }, include: { autor: true } },
    },
  });

  const otro =
    conversacion.tipo === "PRIVADO" ? conversacion.participantes.find((p) => p.userId !== user.id)?.user : null;
  const titulo = conversacion.tipo === "GRUPO" ? conversacion.nombre ?? "Grupo general" : otro ? `${otro.nombre} ${otro.apellidos}` : "Conversación";

  return (
    <>
      <AutoRefresh />
      <PresenceHeartbeat conversacionId={id} />
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-sm font-semibold">{titulo}</p>
        {conversacion.tipo === "GRUPO" && (
          <details className="text-xs text-text-muted">
            <summary className="cursor-pointer">{conversacion.participantes.length} miembros</summary>
            <ul className="mt-2 space-y-1">
              {conversacion.participantes.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span>
                    {p.user.nombre} {p.user.apellidos}
                  </span>
                  {esAdmin && p.userId !== user.id && (
                    <form action={expulsarDelGrupo}>
                      <input type="hidden" name="conversacionId" value={id} />
                      <input type="hidden" name="userId" value={p.userId} />
                      <button type="submit" className="text-danger hover:underline">
                        Quitar
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conversacion.mensajes.length === 0 && (
          <p className="text-center text-sm text-text-muted mt-8">Todavía no hay mensajes. Escribe el primero.</p>
        )}
        {conversacion.mensajes.map((m) => {
          const esMio = m.autorId === user.id;
          const puedeBorrar = esMio || esAdmin;
          return (
            <div key={m.id} className={`group flex gap-2 ${esMio ? "flex-row-reverse" : ""}`}>
              <div className="h-8 w-8 rounded-full border border-border shrink-0 overflow-hidden">
                <Avatar url={m.autor.avatarUrl} nombre={m.autor.nombre} apellidos={m.autor.apellidos} />
              </div>
              <div className={`max-w-[70%] ${esMio ? "items-end" : "items-start"} flex flex-col`}>
                {!esMio && conversacion.tipo === "GRUPO" && (
                  <span className="text-[11px] text-text-muted mb-0.5">
                    {m.autor.nombre} {m.autor.apellidos}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  {esMio && puedeBorrar && (
                    <form action={eliminarMensaje} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="conversacionId" value={id} />
                      <button type="submit" title="Borrar mensaje" className="text-text-muted hover:text-danger">
                        <X className="h-3 w-3" />
                      </button>
                    </form>
                  )}
                  <div
                    className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                      esMio ? "bg-accent text-accent-foreground" : "bg-surface-2"
                    }`}
                  >
                    {m.contenido}
                  </div>
                  {!esMio && puedeBorrar && (
                    <form action={eliminarMensaje} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="conversacionId" value={id} />
                      <button type="submit" title="Borrar mensaje (moderación)" className="text-text-muted hover:text-danger">
                        <X className="h-3 w-3" />
                      </button>
                    </form>
                  )}
                </div>
                <span className="text-[10px] text-text-muted mt-0.5">
                  {m.createdAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <EnviarMensajeForm conversacionId={id} />
    </>
  );
}
