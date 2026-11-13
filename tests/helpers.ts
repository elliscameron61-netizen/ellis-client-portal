import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function resetDatabase() {
  await prisma.emailMessage.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.storedObject.deleteMany();
  await prisma.jobResource.deleteMany();
  await prisma.jobNote.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.faultRequest.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.job.deleteMany();
  await prisma.authToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.site.deleteMany();
  await prisma.organisation.deleteMany();
}

export async function createOrganisation(name: string, portalEnabled = true) {
  return prisma.organisation.create({ data: { name, portalEnabled } });
}

export async function createSite(organisationId: string, name: string) {
  return prisma.site.create({
    data: { organisationId, name, address: `${name} address` },
  });
}

export async function createUser(input: {
  email: string;
  name: string;
  role: "ADMIN" | "CLIENT";
  organisationId?: string | null;
  password?: string;
  disabled?: boolean;
}) {
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      organisationId: input.organisationId ?? null,
      disabled: input.disabled ?? false,
      passwordHash: await hashPassword(input.password ?? "test-password-1"),
    },
  });
}
