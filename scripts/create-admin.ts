import { PrismaClient } from "@prisma/client";
import { hashPassword, passwordProblem } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !name) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_NAME.");
  }
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  if (password.toLowerCase().includes("example")) {
    throw new Error("Choose a password that is not an example password.");
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role: "ADMIN", passwordHash, disabled: false, organisationId: null },
    create: { email, name, role: "ADMIN", passwordHash },
  });
  console.log(`Ellis admin ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
