"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { INTENTOS_MAX, BLOQUEO_MS, registrarIntentoFallido, registrarAcceso, ipDeHeaders } from "@/lib/login-security";
import { enviarLogDiscord, avisarOwnerDiscord } from "@/lib/discord-logs";

export type LoginState = { error: string | null };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const totp = formData.get("totp");
  const callbackUrl = formData.get("callbackUrl");
  const remember = formData.get("remember") === "on" ? "true" : "false";

  try {
    await signIn("credentials", {
      email,
      password,
      totp,
      remember,
      redirectTo: typeof callbackUrl === "string" && callbackUrl ? callbackUrl : "/dashboard",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Correo, contraseña o código de verificación incorrectos." };
    }
    throw error;
  }
}

export type PrecheckState = { ok: boolean; requiere2FA: boolean; error: string | null };

/**
 * Primer paso del login: valida correo+contraseña sin crear sesión, para que
 * el formulario solo muestre el campo del código de verificación en dos
 * pasos cuando de verdad hace falta. Comparte el contador de fuerza bruta
 * con authorize() (src/auth.ts) — un intento fallido acá también cuenta.
 */
export async function precheckLogin(email: string, password: string): Promise<PrecheckState> {
  const correo = email.toLowerCase().trim();
  const ip = await ipDeHeaders();

  const user = await prisma.user.findUnique({ where: { email: correo } });
  if (!user) {
    registrarAcceso(correo, ip, false, "usuario_no_encontrado");
    return { ok: false, requiere2FA: false, error: "Correo o contraseña incorrectos." };
  }
  if (!user.activo) {
    registrarAcceso(correo, ip, false, "cuenta_inhabilitada", user.id);
    return { ok: false, requiere2FA: false, error: "Esta cuenta está inhabilitada. Contacta con un administrador." };
  }
  if (user.suspendidoHasta && user.suspendidoHasta.getTime() > Date.now()) {
    registrarAcceso(correo, ip, false, "cuenta_suspendida", user.id);
    const hasta = user.suspendidoHasta.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
    return { ok: false, requiere2FA: false, error: `Esta cuenta está suspendida temporalmente hasta el ${hasta}.` };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    registrarAcceso(correo, ip, false, "credenciales_invalidas", user.id);
    const intentos = registrarIntentoFallido(correo);
    await enviarLogDiscord(
      prisma,
      "accesos",
      `⚠️ Login fallido para **${correo}** desde \`${ip}\` (credenciales · intento ${intentos}/${INTENTOS_MAX}).`,
    );
    if (intentos >= INTENTOS_MAX) {
      const hasta = new Date(Date.now() + BLOQUEO_MS);
      await prisma.user.update({ where: { id: user.id }, data: { suspendidoHasta: hasta } });
      await avisarOwnerDiscord(
        prisma,
        `Posible ataque de fuerza bruta: **${correo}** (${user.nombre} ${user.apellidos}) tuvo ${intentos} logins fallidos seguidos desde \`${ip}\`. Cuenta bloqueada temporalmente hasta las ${hasta.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`,
        { email: correo, ip },
      );
    }
    return { ok: false, requiere2FA: false, error: "Correo o contraseña incorrectos." };
  }

  return { ok: true, requiere2FA: user.totpHabilitado, error: null };
}
