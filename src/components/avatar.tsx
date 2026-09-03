/** Foto de perfil si existe; si no, las iniciales del nombre sobre un fondo de color. */
export function Avatar({
  url,
  nombre = "",
  apellidos = "",
  className = "",
}: {
  url?: string | null;
  nombre?: string;
  apellidos?: string;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- puede ser una URL externa (Vercel Blob)
      <img src={url} alt="" className={`h-full w-full object-cover ${className}`} />
    );
  }
  const iniciales = `${nombre[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase() || "?";
  return (
    <div
      className={`h-full w-full flex items-center justify-center bg-accent/15 text-accent font-semibold ${className}`}
      style={{ fontSize: "38%" }}
    >
      {iniciales}
    </div>
  );
}
