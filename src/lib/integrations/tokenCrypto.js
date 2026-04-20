import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function getEncryptionSecret() {
  const raw = process.env.INTERNAL_OAUTH_STATE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error("Brak poprawnej konfiguracji INTERNAL_OAUTH_STATE_SECRET lub NEXTAUTH_SECRET.");
  }
  return raw;
}

function buildKey() {
  return createHash("sha256").update(getEncryptionSecret(), "utf8").digest();
}

export function encryptSecret(value) {
  if (!value) return null;
  const key = buildKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(payload) {
  if (!payload) return null;
  const [ivBase64, authTagBase64, encryptedBase64] = String(payload).split(":");
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error("Nieprawidłowy format zaszyfrowanej wartości.");
  }

  const key = buildKey();
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function hashStateValue(value) {
  const secret = getEncryptionSecret();
  return createHash("sha256").update(`${secret}:${value}`, "utf8").digest("hex");
}

