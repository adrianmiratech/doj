import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/labels";
import { ChangePasswordForm } from "@/components/change-password-form";
import { SessionExpiredCard } from "@/components/session-expired-card";
import { TotpSetupForm } from "@/components/totp-setup-form";
import { actualizarDiscordId } from "@/lib/actions/configuracion";
import { generarQrTotp } from "@/lib/totp";

export default async function PerfilStaffPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { id: session!.user.id } });
  if (!user) return <SessionExpiredCard />;

  const qrDataUrl =
    !user.totpHabilitado && user.totpSecret ? await generarQrTotp(user.email, user.totpSecret) : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold">Mi perfil</h1>
        <p className="text-sm text-text-muted">Información de tu cuenta institucional y configuración de acceso.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="rounded-lg border border-border bg-surface p-5 space-y-2 text-sm">
          <Row label="Nombre" value={`${user.nombre} ${user.apellidos}`} />
          <Row label="Correo" value={user.email} />
          <Row label="Rol" value={ROLE_LABELS[user.role]} />
          <Row label="Cargo" value={user.cargo ?? "—"} />
          <Row label="Placa" value={user.legajo ? `#${user.legajo}` : "—"} />
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold mb-4">Cambiar contraseña</h2>
          <ChangePasswordForm />
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold mb-1">Verificación en dos pasos</h2>
          <p className="text-xs text-text-muted mb-4">
            Añade una capa extra de seguridad: además de tu contraseña, te pedirá un código generado por una app
            de tu teléfono cada vez que inicies sesión.
          </p>
          <TotpSetupForm
            habilitado={user.totpHabilitado}
            qrDataUrl={qrDataUrl}
            secretoManual={!user.totpHabilitado ? user.totpSecret : null}
          />
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold mb-1">ID de Discord</h2>
          <p className="text-xs text-text-muted mb-4">
            Vincula tu cuenta de Discord para recibir menciones en alertas del Departamento.
          </p>
          <form action={actualizarDiscordId} className="flex gap-2">
            <input
              name="discordId"
              defaultValue={user.discordId ?? ""}
              placeholder="Tu ID de usuario de Discord"
              className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent font-mono"
            />
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
            >
              Guardar
            </button>
          </form>
          {user.discordId && (
            <p className="mt-2 text-xs text-success">ID válido · recibirás menciones en las alertas</p>
          )}
          <details className="mt-4 text-xs text-text-muted">
            <summary className="cursor-pointer">¿Cómo obtener tu ID de Discord?</summary>
            <ol className="mt-2 list-decimal list-inside space-y-1">
              <li>Abre Discord y ve a Configuración de usuario</li>
              <li>Ve a Avanzado y activa Modo desarrollador</li>
              <li>Haz clic derecho sobre tu nombre de usuario</li>
              <li>Selecciona Copiar ID de usuario</li>
              <li>Pega el número aquí</li>
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 last:border-0 py-1.5">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
