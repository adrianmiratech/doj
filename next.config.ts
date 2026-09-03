import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El límite por defecto de Next.js para el cuerpo de una Server Action es 1MB,
  // demasiado poco para subir fotos de perfil o evidencias (PDF/imagen).
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
