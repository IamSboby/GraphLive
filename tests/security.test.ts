import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { encodeBackup, decodeBackup } from "../packages/security/backup";
describe("Encrypted backups", () => {
  it("round-trips authenticated encryption and refuses tampering", () => {
    const key = randomBytes(32).toString("hex"),
      plain = JSON.stringify({ private: "sensitive" }),
      encoded = encodeBackup(plain, key);
    expect(encoded).not.toContain("sensitive");
    expect(decodeBackup(encoded, key)).toBe(plain);
    const v = JSON.parse(encoded);
    v.tag = "00".repeat(16);
    expect(() => decodeBackup(JSON.stringify(v), key)).toThrow();
    expect(() => decodeBackup(encoded, "11".repeat(32))).toThrow();
  });
  it("rejects malformed keys", () => {
    expect(() => encodeBackup("{}", "not-a-key")).toThrow();
  });
});
