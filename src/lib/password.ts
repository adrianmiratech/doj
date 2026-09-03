import { randomInt } from "node:crypto";

const PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generarPasswordTemporal(length = 10) {
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)];
  return out;
}
