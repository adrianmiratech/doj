import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOJ · Departamento de Justicia",
  description:
    "Portal oficial del Departamento de Justicia de Old State RP. Trámites, solicitudes y gestión de expedientes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col bg-bg text-text">{children}</body>
    </html>
  );
}
