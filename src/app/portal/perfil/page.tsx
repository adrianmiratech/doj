import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/components/change-password-form";
import { SessionExpiredCard } from "@/components/session-expired-card";
import { TotpSetupForm } from "@/components/totp-setup-form";
import { actualizarDiscordId } from "@/lib/actions/configuracion";
import { generarQrTotp } from "@/lib/totp";

export default async function PerfilCivilPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { id: session!.user.id } });
  if (!user) return <SessionExpiredCard />;

  const qrDataUrl =
    !user.totpHabilitado && user.totpSecret ? await generarQrTotp(user.email, user.totpSecret) : null;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold">Mi perfil</h1>
        <p className="text-sm text-text-muted">Información de tu cuenta ciudadana.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 space-y-2 text-sm">
        <Row label="Nombre" value={`${user.nombre} ${user.apellidos}`} />
        <Row label="Correo" value={user.email} />
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
          Vincula tu cuenta de Discord para recibir notificaciones sobre tus trámites, postulaciones y juicios.
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
          <p className="mt-2 text-xs text-success">ID válido · recibirás notificaciones por Discord</p>
        )}
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
