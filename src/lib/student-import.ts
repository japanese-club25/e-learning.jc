import * as XLSX from "xlsx";
import { Category } from "@prisma/client";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;

export interface ImportStudentRow {
  name: string;
  email: string;
  className: string;
  category: Category;
  password?: string;
  examCode?: string;
}

export function parseStudentFile(fileName: string, bytes: Buffer): Record<string, unknown>[] {
  if (bytes.length > MAX_IMPORT_BYTES) throw new Error("File exceeds the 5 MB limit");
  const workbook = XLSX.read(bytes, { type: "buffer", raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("File has no worksheet");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`File exceeds the ${MAX_IMPORT_ROWS} row limit`);
  return rows;
}

function value(row: Record<string, unknown>, ...keys: string[]) {
  const key = Object.keys(row).find((candidate) => keys.includes(candidate.trim().toLowerCase()));
  return key ? String(row[key] ?? "").trim() : "";
}

export function normalizeStudentRow(row: Record<string, unknown>): ImportStudentRow {
  const name = value(row, "name", "nama");
  const email = value(row, "email").toLowerCase();
  const className = value(row, "class", "class_name", "kelas");
  const categoryValue = value(row, "category", "kategori");
  const category = categoryValue as Category;

  if (!name || !email || !className) throw new Error("name, email, and class are required");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("invalid email");
  if (!Object.values(Category).includes(category)) throw new Error("category must be Gengo or Bunka");

  const password = value(row, "password", "initial_password") || undefined;
  if (password && password.length < 6) throw new Error("password must be at least 6 characters");
  return {
    name,
    email,
    className,
    category,
    password,
    examCode: value(row, "exam_code", "examcode") || undefined,
  };
}
