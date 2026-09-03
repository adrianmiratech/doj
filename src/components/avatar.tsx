import { Shield } from "lucide-react";

/** Foto de perfil si existe; si no, un escudo institucional en vez de las iniciales. */
export function Avatar({ url, className = "" }: { url?: string | null; className?: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- puede ser una URL externa (Vercel Blob)
      <img src={url} alt="" className={`h-full w-full object-cover ${className}`} />
    );
  }
  return (
    <div className={`h-full w-full flex items-center justify-center bg-accent/15 ${className}`}>
      <Shield className="h-[55%] w-[55%] text-accent" />
    </div>
  );
}
