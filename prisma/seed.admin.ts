import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_SEED_PASSWORD is required. Refusing to create an admin with a default password.");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_SEED_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@gmail.com" },
    update: { password_hash: passwordHash },
    create: { email: "admin@gmail.com", password_hash: passwordHash },
  });

  console.log("Admin seed completed: admin@gmail.com");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
