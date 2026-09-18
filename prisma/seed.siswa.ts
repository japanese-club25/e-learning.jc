import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const students = [
  ["Azna Khaizan El Aufi", "X DKV 3"],
  ["Fawwaz Hafizd Hermawan", "X DKV 3"],
  ["Almer Jabbar Antoro", "X DKV 3"],
  ["Marfin Gervanius Hasugian", "X TKR 1"],
  ["Zaidan Auliya Fakhriy", "X TOI 2"],
  ["Ahmad Zulfan Kamaly", "X TKJ 2"],
  ["Muhammad Azril Madani", "X TKJ 2"],
  ["Alif Ilham Pratama", "X TKJ 2"],
  ["Rafa Afkar Hartopik", "X DPIB 2"],
  ["Nazmi Danish Tahira", "X DPIB 2"],
  ["Ahmad Alfin Dwi Prasetyo", "X TKR 1"],
  ["Annisa Febria P", "XI DPIB 1"],
  ["Yoga Laiya Pratama", "XIII TFLM"],
  ["M. Zufar", "XI TOI 1"],
  ["Naila Zahwatun Nissa", "XII DPIB 1"],
  ["Fatar Gaza", "XII SIJA 2"],
  ["Radithya Fajri Abhipraya", "XI RPL 1"],
  ["Giovanni Achmad Avicena", "XII SIJA 2"],
  ["Zidan Hafiqi", "XI TKR 1"],
  ["Virqi Ahmad Ardiansyah", "XI SIJA"],
  ["Bianca Luminic Azzahara", "XI TOI 1"],
  ["Alief Pratama", "XII TOI 2"],
  ["Nurul Shyfa", "XI TOI 2"],
  ["Aretha Azaria", "XI DKV 3"],
  ["Annisa Fauziah", "XI DKV 3"],
  ["Deandra Andara", "XI DKV 3"],
  ["Sarah Putri Maharani", "XI DKV 3"],
  ["Nayla Zahra Mufidah", "XI TKP 2"],
  ["Aida Nur Fajriani", "XII DKV 2"],
  ["Rumaisa Famestyani", "XII DKV 2"],
  ["Nuri Fajriyanti", "XII DKV 1"],
  ["Leila Fauzia Safitri", "XII DKV 4"],
  ["Arviona Devi Syafiqa", "XI DKV 3"],
  ["M. Rasya R.A", "XI SIJA"],
  ["Surya Krisnan Naidu", "XI SIJA"],
  ["M. Hubbi El F.", "XII RPL 1"],
  ["M. Ilham Aziiz", "XII TFLM 1"],
] as const;

function emailFor(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
  return `${slug}@student.local`;
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  for (const [name, className] of students) {
    const email = emailFor(name);
    await prisma.student.upsert({
      where: { email },
      update: {
        name,
        class: className,
      },
      create: {
        name,
        email,
        class: className,
        password_hash: passwordHash,
        is_first_login: true,
      },
    });
  }

  console.log(`Seeded ${students.length} students.`);
  console.log("Initial password: password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
