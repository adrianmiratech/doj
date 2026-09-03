import { ShieldAlert } from "lucide-react";
import { TotpSetupForm } from "@/components/totp-setup-form";

/**
 * Si el rango del usuario exige 2FA y todavía no lo activó, bloquea el resto
 * del portal y deja configurarla ahí mismo (sin mandarlo a otra pantalla).
 */
export function TotpGate({
  activo,
  qrDataUrl,
  secretoManual,
  children,
}: {
  activo: boolean;
  qrDataUrl: string | null;
  secretoManual: string | null;
  children: React.ReactNode;
}) {
  if (activo) {
    return (
      <div className="max-w-md mx-auto mt-10 space-y-4">
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-full bg-warning/15 border border-warning/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-6 w-6 text-warning" />
          </div>
          <h1 className="text-lg font-semibold">Verificación en dos pasos obligatoria</h1>
          <p className="text-sm text-text-muted">
            Tu rango exige tener la verificación en dos pasos activada. Configurala aquí mismo para poder seguir
            usando el portal.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <TotpSetupForm habilitado={false} qrDataUrl={qrDataUrl} secretoManual={secretoManual} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
