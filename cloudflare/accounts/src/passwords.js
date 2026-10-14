import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { HttpError } from "../../shared/http.js";
const ITERATIONS = 600000;
const FORMAT = /^pbkdf2-sha256\$600000\$([a-f0-9]{32})\$([a-f0-9]{64})$/;
export const ADMIN_EMAIL = "admin@cutting.com";
export function validatePassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 15 ||
    password.length > 128
  )
    throw new HttpError(400, "Use uma senha com 15 a 128 caracteres.");
}
const derive = (password, salt) =>
  new Promise((resolve, reject) => {
    pbkdf2(
      password,
      Buffer.from(salt, "hex"),
      ITERATIONS,
      32,
      "sha256",
      (error, hash) => (error ? reject(error) : resolve(hash)),
    );
  });
export async function hashPassword(password) {
  validatePassword(password);
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt);
  return `pbkdf2-sha256$${ITERATIONS}$${salt}$${hash.toString("hex")}`;
}
export async function verifyPassword(password, encoded) {
  const match = typeof encoded === "string" && encoded.match(FORMAT);
  const candidate = await derive(password, match ? match[1] : "0".repeat(32));
  return (
    timingSafeEqual(
      candidate,
      Buffer.from(match ? match[2] : "0".repeat(64), "hex"),
    ) && !!match
  );
}
