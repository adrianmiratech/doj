import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

export function generarSecretoTotp(): string {
  return generateSecret();
}

export async function verificarCodigoTotp(secreto: string, codigo: string): Promise<boolean> {
  try {
    const resultado = await verify({ secret: secreto, token: codigo.trim(), epochTolerance: 30 });
    return resultado.valid;
  } catch {
    return false;
  }
}

export async function generarQrTotp(email: string, secreto: string): Promise<string> {
  const otpauth = generateURI({ issuer: "DOJ Old State RP", label: email, secret: secreto });
  return QRCode.toDataURL(otpauth);
}

/** Si el rango tiene la verificación en dos pasos marcada como obligatoria por el Juez Supremo. */
export const totpObligatorioParaRol = cache(async (role: Role): Promise<boolean> => {
  const fila = await prisma.rolTotp.findUnique({ where: { role } });
  return fila?.obligatorio ?? false;
});
