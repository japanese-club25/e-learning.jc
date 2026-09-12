import * as XLSX from "xlsx";
import { normalizeStudentRow, parseStudentFile } from "../student-import";

describe("student import", () => {
  it("normalizes supported student columns", () => {
    expect(normalizeStudentRow({ Nama: " Siti ", Email: "SITI@EXAMPLE.COM", Kelas: "A", Kategori: "Gengo" })).toEqual({
      name: "Siti",
      email: "siti@example.com",
      className: "A",
      category: "Gengo",
      password: undefined,
      examCode: undefined,
    });
  });

  it("parses CSV and rejects invalid category", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ name: "A", email: "a@example.com", class: "A", category: "Other" }]), "Students");
    const bytes = XLSX.write(workbook, { type: "buffer", bookType: "csv" });
    expect(parseStudentFile("students.csv", bytes)).toHaveLength(1);
    expect(() => normalizeStudentRow(parseStudentFile("students.csv", bytes)[0])).toThrow("category must be Gengo or Bunka");
  });
});
