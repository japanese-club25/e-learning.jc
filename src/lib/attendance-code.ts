import { createHash, randomInt } from "crypto";

export function generateAttendanceCode() {
  return String(randomInt(100000, 1000000));
}

export function hashAttendanceCode(code: string) {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function isValidAttendanceCode(code: unknown): code is string {
  return typeof code === "string" && /^\d{6}$/.test(code.trim());
}
