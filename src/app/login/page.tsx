import Link from "next/link";
import { Scale } from "lucide-react";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mb-3">
            <Scale className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-lg font-semibold">Departamento de Justicia</h1>
          <p className="text-sm text-text-muted">Old State RP · Acceso al portal</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <LoginForm callbackUrl={callbackUrl ?? ""} />
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          ¿Eres ciudadano y no tienes cuenta?{" "}
          <Link href="/registro" className="text-accent hover:underline">
            Regístrate
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-text-muted">
          <Link href="/" className="hover:text-text transition-colors">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
