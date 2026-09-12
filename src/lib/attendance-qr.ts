import { createHash, randomBytes } from "crypto";

export function generateAttendanceQrToken() {
  return `attn_${randomBytes(32).toString("base64url")}`;
}

export function hashAttendanceQrToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
