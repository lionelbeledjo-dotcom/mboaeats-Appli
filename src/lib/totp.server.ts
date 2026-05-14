import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";
import * as OTPAuth from "otpauth";

function getKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOTP_ENCRYPTION_KEY manquant");
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): { ciphertext: string; iv: string; tag: string } {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: enc.toString("base64"), iv: iv.toString("base64"), tag: tag.toString("base64") };
}

export function decryptSecret(ciphertext: string, iv: string, tag: string): string {
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

export function generateTotpSecret(): string {
  // 20 octets => secret base32 standard
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function buildOtpAuthUrl(label: string, secret: string, issuer = "MboaEats SuperAdmin"): string {
  const totp = new OTPAuth.TOTP({
    issuer,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const cleaned = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  // Tolérance ±1 pas (30s) pour l'horloge
  const delta = totp.validate({ token: cleaned, window: 1 });
  return delta !== null;
}

function randomGroup(len: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function generateBackupCodes(count = 10): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = `${randomGroup(4)}-${randomGroup(4)}`;
    plain.push(code);
    hashed.push(hashBackupCode(code));
  }
  return { plain, hashed };
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function consumeBackupCode(hashed: string[], submitted: string): { ok: boolean; remaining: string[] } {
  const target = hashBackupCode(submitted);
  const targetBuf = Buffer.from(target, "hex");
  for (let i = 0; i < hashed.length; i++) {
    const h = Buffer.from(hashed[i], "hex");
    if (h.length === targetBuf.length && timingSafeEqual(h, targetBuf)) {
      const remaining = [...hashed.slice(0, i), ...hashed.slice(i + 1)];
      return { ok: true, remaining };
    }
  }
  return { ok: false, remaining: hashed };
}
