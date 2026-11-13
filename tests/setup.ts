import { afterAll } from "vitest";
import { prisma } from "@/lib/db";

if (!process.env.DATABASE_URL?.includes("ellis_portal_test")) {
  throw new Error(`Refusing to run tests against ${process.env.DATABASE_URL}`);
}

afterAll(async () => {
  await prisma.$disconnect();
});
