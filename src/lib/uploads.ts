import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const TIPOS_EVIDENCIA: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const TAMANO_MAXIMO_EVIDENCIA = 8 * 1024 * 1024;

const TIPOS_IMAGEN: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const TAMANO_MAXIMO_AVATAR = 2 * 1024 * 1024;

/**
 * Guarda un archivo subido y devuelve su URL pública. Si hay un token de
 * Vercel Blob configurado (producción), sube ahí, porque en Vercel el
 * filesystem es de solo lectura y no persiste entre despliegues. Si no
 * (desarrollo local), lo guarda en disco bajo public/uploads como antes.
 */
async function guardarArchivo(file: File, subcarpeta: string, extension: string, nombreBase?: string): Promise<string> {
  const nombreArchivo = `${nombreBase ?? Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${subcarpeta}/${nombreArchivo}`, buffer, {
      access: "public",
      contentType: file.type,
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", "uploads", subcarpeta);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, nombreArchivo), buffer);
  return `/api/uploads/${subcarpeta}/${nombreArchivo}`;
}

/** Guarda un archivo de evidencia (imagen o PDF) bajo la subcarpeta indicada y devuelve su URL. */
export async function guardarArchivoEvidencia(file: File | null, subcarpeta: string): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const extension = TIPOS_EVIDENCIA[file.type];
  if (!extension) throw new Error("Formato de archivo no soportado (usa PNG, JPG, WEBP o PDF)");
  if (file.size > TAMANO_MAXIMO_EVIDENCIA) throw new Error("El archivo no puede superar 8MB");

  try {
    return await guardarArchivo(file, subcarpeta, extension);
  } catch (error) {
    console.error(`[guardarArchivoEvidencia] Error guardando archivo en ${subcarpeta}:`, error);
    throw new Error("No se pudo guardar el archivo adjunto. Inténtalo de nuevo.");
  }
}

/** Guarda la foto de perfil de un empleado y devuelve su URL. */
export async function guardarAvatar(file: File, id: string): Promise<string> {
  const extension = TIPOS_IMAGEN[file.type];
  if (!extension) throw new Error("Formato de imagen no soportado (usa PNG, JPG o WEBP)");
  if (file.size > TAMANO_MAXIMO_AVATAR) throw new Error("La imagen no puede superar 2MB");

  try {
    return await guardarArchivo(file, "avatars", extension, id);
  } catch (error) {
    console.error("[guardarAvatar] Error guardando la foto:", error);
    throw new Error("No se pudo guardar la foto. Inténtalo de nuevo.");
  }
}
