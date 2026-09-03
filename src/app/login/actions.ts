"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

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
