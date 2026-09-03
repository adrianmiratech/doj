import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { marcarConversacionLeida, enviarMensaje } from "@/lib/actions/mensajeria";
import { AutoRefresh } from "@/components/auto-refresh";
import { Avatar } from "@/components/avatar";

export default async function ConversacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user;

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
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-sm font-semibold">{titulo}</p>
        {conversacion.tipo === "GRUPO" && (
          <p className="text-xs text-text-muted">{conversacion.participantes.length} miembros</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conversacion.mensajes.length === 0 && (
          <p className="text-center text-sm text-text-muted mt-8">Todavía no hay mensajes. Escribe el primero.</p>
        )}
        {conversacion.mensajes.map((m) => {
          const esMio = m.autorId === user.id;
          return (
            <div key={m.id} className={`flex gap-2 ${esMio ? "flex-row-reverse" : ""}`}>
              <div className="h-8 w-8 rounded-full border border-border shrink-0 overflow-hidden">
                <Avatar url={m.autor.avatarUrl} nombre={m.autor.nombre} apellidos={m.autor.apellidos} />
              </div>
              <div className={`max-w-[70%] ${esMio ? "items-end" : "items-start"} flex flex-col`}>
                {!esMio && conversacion.tipo === "GRUPO" && (
                  <span className="text-[11px] text-text-muted mb-0.5">
                    {m.autor.nombre} {m.autor.apellidos}
                  </span>
                )}
                <div
                  className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    esMio ? "bg-accent text-accent-foreground" : "bg-surface-2"
                  }`}
                >
                  {m.contenido}
                </div>
                <span className="text-[10px] text-text-muted mt-0.5">
                  {m.createdAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <form action={enviarMensaje} className="p-3 border-t border-border flex gap-2 shrink-0">
        <input type="hidden" name="conversacionId" value={id} />
        <input
          name="contenido"
          required
          autoComplete="off"
          placeholder="Escribe un mensaje…"
          className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
        >
          Enviar
        </button>
      </form>
    </>
  );
}
