import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
export function encodeBackup(
  plain: string,
  key = process.env.BACKUP_ENCRYPTION_KEY,
) {
  if (!key) return plain;
  const bytes = Buffer.from(key, "hex");
  if (bytes.length !== 32 || !/^[a-f0-9]{64}$/i.test(key))
    throw new Error("invalidBackupKey");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", bytes, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return JSON.stringify({
    encryption: "aes-256-gcm",
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    data: data.toString("base64"),
  });
}
export function decodeBackup(
  encoded: string,
  key = process.env.BACKUP_ENCRYPTION_KEY,
) {
  const v = JSON.parse(encoded);
  if (v.encryption !== "aes-256-gcm") return encoded;
  if (!key) throw new Error("backupKeyRequired");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    Buffer.from(v.iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(v.tag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(v.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
