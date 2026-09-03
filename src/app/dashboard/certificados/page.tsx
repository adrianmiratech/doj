import { auth } from "@/auth";
import { ROLE_LABELS } from "@/lib/labels";
import { CertificadoForm } from "./certificado-form";

export default async function CertificadosPage() {
  const session = await auth();
  const user = session!.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Certificado de Antecedentes</h1>
        <p className="text-sm text-text-muted">Crea y emite certificados de antecedentes penales.</p>
      </div>

      <CertificadoForm
        rango={ROLE_LABELS[user.role]}
        apellidos={user.apellidos}
        legajo={user.legajo}
      />
    </div>
  );
}
