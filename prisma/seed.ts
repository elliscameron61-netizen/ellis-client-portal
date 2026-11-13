import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { buildImportKey } from "../src/lib/csv";
import { examplePhotoPng, simplePdf } from "../src/lib/files";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

function on(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "This seed loads fictional example clients only. Do not run it in production. Use npm run admin:create for the first staff account.",
    );
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Example-Admin-2026!";
  const clientPassword = process.env.SEED_CLIENT_PASSWORD || "Example-Client-2026!";
  const adminHash = await hashPassword(adminPassword);
  const clientHash = await hashPassword(clientPassword);

  const property = await upsertOrg({
    name: "Example Property Management",
    portalEnabled: true,
    contactName: "Alex Example",
    contactEmail: "office@example-property.test",
    contactPhone: "010 000 0000",
    notes: "Fictional demonstration client. Not a real organisation.",
  });
  const hotel = await upsertOrg({
    name: "Example Hotel Group",
    portalEnabled: true,
    contactName: "Sam Example",
    contactEmail: "facilities@example-hotel.test",
    contactPhone: "010 000 0001",
    notes: "Fictional demonstration client. Not a real organisation.",
  });
  const bodyCorporate = await upsertOrg({
    name: "Example Body Corporate",
    portalEnabled: false,
    contactName: "Jordan Example",
    contactEmail: "trustees@example-complex.test",
    contactPhone: "010 000 0002",
    notes: "Fictional client with portal access turned off.",
  });

  const heights = await upsertSite(property.id, "Example Heights", "12 Example Road, Sandton");
  const warehouse = await upsertSite(property.id, "Example Warehouse", "4 Sample Street, Johannesburg");
  const lodge = await upsertSite(hotel.id, "Example Lodge", "8 Sample Lane, Rosebank");
  const complex = await upsertSite(bodyCorporate.id, "Example Complex", "1 Sample Close, Randburg");

  await upsertUser({
    email: "dev-admin@elliselectrical.example",
    name: "Ellis Example Admin",
    role: "ADMIN",
    passwordHash: adminHash,
    organisationId: null,
  });
  const alex = await upsertUser({
    email: "alex.example@example-property.test",
    name: "Alex Example",
    role: "CLIENT",
    passwordHash: clientHash,
    organisationId: property.id,
  });
  await upsertUser({
    email: "sam.example@example-hotel.test",
    name: "Sam Example",
    role: "CLIENT",
    passwordHash: clientHash,
    organisationId: hotel.id,
  });

  const geyser = await upsertJob({
    organisationId: property.id,
    siteId: heights.id,
    externalRef: "EE-1042",
    title: "Smart geyser timer installation",
    description:
      "Example job. Supply and install a digital smart geyser timer, label the isolator, and leave a short programming guide for the site team.",
    status: "Completed",
    scheduledAt: on(2026, 8, 4),
    completedAt: on(2026, 8, 4),
    team: "Example Technician A",
  });
  const board = await upsertJob({
    organisationId: property.id,
    siteId: heights.id,
    externalRef: "EE-1108",
    title: "Distribution board inspection",
    description: "Example job. Visual inspection of DB 2. Access to the riser cupboard is still outstanding.",
    status: "In progress",
    scheduledAt: on(2026, 11, 18),
    team: "Example Technician A",
  });
  await upsertJob({
    organisationId: property.id,
    siteId: heights.id,
    importKey: buildImportKey([
      "Example Property Management",
      "Example Heights",
      "Replace passage bulkhead lights",
      "02/11/2026",
    ]),
    title: "Replace passage bulkhead lights",
    description: "Example job imported without a Tradify job number.",
    status: "Completed",
    scheduledAt: on(2026, 11, 2),
    completedAt: on(2026, 11, 2),
    team: "Example Technician B",
  });
  const supply = await upsertJob({
    organisationId: property.id,
    siteId: warehouse.id,
    externalRef: "EE-0988",
    title: "Three-phase supply repair",
    description: "Example job. Traced a loose termination on the main supply and reterminated it.",
    status: "Completed",
    scheduledAt: on(2026, 9, 18),
    completedAt: on(2026, 9, 18),
    team: "Example Technician A, Example Technician B",
  });
  await upsertJob({
    organisationId: hotel.id,
    siteId: lodge.id,
    externalRef: "EE-1200",
    title: "Kitchen extract fan circuit",
    description: "Example job. Scheduled work on the kitchen extract fan circuit.",
    status: "Scheduled",
    scheduledAt: on(2026, 11, 28),
    team: "Example Technician B",
  });
  await upsertJob({
    organisationId: bodyCorporate.id,
    siteId: complex.id,
    externalRef: "EE-0770",
    title: "Replace stairwell fittings",
    description: "Example job for a client that does not have portal access.",
    status: "Completed",
    scheduledAt: on(2026, 7, 12),
    completedAt: on(2026, 7, 12),
    team: "Example Technician A",
  });

  await ensureNote(geyser.id, "client", "Example Technician A", [
    "Example note: replaced the mechanical timer with a digital smart geyser timer.",
    "Weekday programme set to heat 04:30–06:30 and 16:30–18:30.",
    "The isolator in DB 2 is labelled Geyser.",
  ].join("\n"));
  await ensureNote(
    geyser.id,
    "internal",
    "Ellis Example Admin",
    "Internal example: the invoice for this work is in QuickBooks. Clients do not see staff-only notes.",
  );
  await ensureNote(
    board.id,
    "client",
    "Example Technician A",
    "Example note: visual inspection started. Waiting on access to the locked riser cupboard.",
  );

  await ensureResource(geyser.id, "video", "How to program your timer", {
    url: "https://example.com/ellis-electrical/how-to-program-your-timer",
    body: "Example video link for the demonstration. Replace it with the real how-to when you have one.",
  });
  await ensureResource(geyser.id, "faq", "The timer display is blank", {
    body: "Check the geyser isolator in the distribution board is switched on. Then hold the timer's set button for three seconds. If the display stays blank, log a fault in this portal.",
  });
  await ensureResource(geyser.id, "faq", "How do I override the programme for one evening?", {
    body: "Press the manual override once to heat outside the programme. Press it again to return to the set programme. The example video on this page shows the same steps.",
  });

  const coc = await ensureCertificate({
    organisationId: property.id,
    siteId: heights.id,
    jobId: geyser.id,
    number: "COC-EX-1042",
    title: "Certificate of Compliance COC-EX-1042",
    issuedAt: on(2026, 8, 4),
    expiresAt: on(2026, 12, 2),
  });
  await ensureCertificate({
    organisationId: property.id,
    siteId: warehouse.id,
    jobId: supply.id,
    number: "COC-EX-0988",
    title: "Certificate of Compliance COC-EX-0988",
    issuedAt: on(2026, 9, 18),
    expiresAt: on(2028, 9, 18),
  });

  await ensureFile({
    organisationId: property.id,
    jobId: geyser.id,
    certificateId: coc.id,
    filename: "example-coc-1042.pdf",
    mimeType: "application/pdf",
    kind: "COC",
    data: simplePdf("EXAMPLE CERTIFICATE OF COMPLIANCE", [
      "This is fictional demonstration data for the Ellis Electrical portal.",
      "It is not a real certificate and has no legal standing.",
      "",
      "Certificate: COC-EX-1042",
      "Site: Example Heights, 12 Example Road, Sandton",
      "Work: Smart geyser timer installation",
      "Issued: 4 August 2026",
      "Next due: 2 December 2026",
      "",
      "Ellis Electrical",
      "info@elliselectrical.co.za",
    ]),
  });
  await ensureFile({
    organisationId: property.id,
    jobId: geyser.id,
    filename: "example-geyser-timer.png",
    mimeType: "image/png",
    kind: "PHOTO",
    data: examplePhotoPng(),
  });

  await ensureInvoice({
    organisationId: property.id,
    externalRef: "INV-EX-4401",
    jobId: geyser.id,
    jobNumber: "EE-1042",
    customerName: "Example Property Management",
    description: "Smart geyser timer installation",
    status: "Paid",
    issuedAt: on(2026, 8, 4),
    dueAt: on(2026, 8, 18),
    totalCents: 485000,
    balanceCents: 0,
  });
  await ensureInvoice({
    organisationId: property.id,
    externalRef: "INV-EX-4510",
    jobId: board.id,
    jobNumber: "EE-1108",
    customerName: "Example Property Management",
    description: "Distribution board inspection",
    status: "Open",
    issuedAt: on(2026, 11, 10),
    dueAt: on(2026, 11, 30),
    totalCents: 276000,
    balanceCents: 276000,
  });
  await ensureInvoice({
    organisationId: property.id,
    externalRef: "INV-EX-3902",
    jobId: supply.id,
    jobNumber: "EE-0988",
    customerName: "Example Property Management",
    description: "Three-phase supply repair",
    status: "Overdue",
    issuedAt: on(2026, 9, 18),
    dueAt: on(2026, 10, 2),
    totalCents: 832000,
    balanceCents: 400000,
  });
  await ensureInvoice({
    organisationId: hotel.id,
    externalRef: "INV-EX-4600",
    jobNumber: "EE-1200",
    customerName: "Example Hotel Group",
    description: "Kitchen extract fan circuit",
    status: "Open",
    issuedAt: on(2026, 11, 1),
    dueAt: on(2026, 12, 15),
    totalCents: 154000,
    balanceCents: 154000,
  });

  const existingFault = await prisma.faultRequest.findFirst({
    where: { description: { startsWith: "Example fault:" } },
  });
  if (!existingFault) {
    await prisma.faultRequest.create({
      data: {
        organisationId: property.id,
        siteId: heights.id,
        createdById: alex.id,
        priority: "NORMAL",
        status: "NEW",
        description:
          "Example fault: the passage light on the second floor flickers. This request is fictional demonstration data.",
      },
    });
  }

  console.log("Seeded fictional example data.");
  console.log("Admin:  dev-admin@elliselectrical.example");
  console.log("Client: alex.example@example-property.test");
  console.log("Client: sam.example@example-hotel.test");
}

async function upsertOrg(data: {
  name: string;
  portalEnabled: boolean;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
}) {
  return prisma.organisation.upsert({
    where: { name: data.name },
    update: data,
    create: data,
  });
}

async function upsertSite(organisationId: string, name: string, address: string) {
  const existing = await prisma.site.findFirst({
    where: { organisationId, name },
  });
  if (existing) return prisma.site.update({ where: { id: existing.id }, data: { address } });
  return prisma.site.create({ data: { organisationId, name, address } });
}

async function upsertUser(data: {
  email: string;
  name: string;
  role: "ADMIN" | "CLIENT";
  passwordHash: string;
  organisationId: string | null;
}) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: data,
    create: data,
  });
}

async function upsertJob(data: {
  organisationId: string;
  siteId: string;
  externalRef?: string;
  importKey?: string;
  title: string;
  description: string;
  status: string;
  scheduledAt?: Date;
  completedAt?: Date;
  team?: string;
}) {
  const existing = data.externalRef
    ? await prisma.job.findFirst({
        where: { organisationId: data.organisationId, externalRef: data.externalRef },
      })
    : await prisma.job.findFirst({
        where: { organisationId: data.organisationId, importKey: data.importKey },
      });
  if (existing) {
    return prisma.job.update({
      where: { id: existing.id },
      data: { ...data, source: "tradify" },
    });
  }
  return prisma.job.create({ data: { ...data, source: "tradify" } });
}

async function ensureNote(jobId: string, visibility: string, authorName: string, body: string) {
  const existing = await prisma.jobNote.findFirst({ where: { jobId, body } });
  if (existing) return existing;
  return prisma.jobNote.create({ data: { jobId, visibility, authorName, body } });
}

async function ensureResource(
  jobId: string,
  kind: string,
  title: string,
  extra: { url?: string; body?: string },
) {
  const existing = await prisma.jobResource.findFirst({ where: { jobId, title } });
  if (existing) return existing;
  return prisma.jobResource.create({ data: { jobId, kind, title, ...extra } });
}

async function ensureCertificate(data: {
  organisationId: string;
  siteId: string;
  jobId: string;
  number: string;
  title: string;
  issuedAt: Date;
  expiresAt: Date;
}) {
  const existing = await prisma.certificate.findFirst({
    where: { organisationId: data.organisationId, number: data.number },
  });
  if (existing) return prisma.certificate.update({ where: { id: existing.id }, data });
  return prisma.certificate.create({ data: { ...data, type: "COC" } });
}

async function ensureFile(input: {
  organisationId: string;
  jobId: string;
  certificateId?: string;
  filename: string;
  mimeType: string;
  kind: "PHOTO" | "DOCUMENT" | "COC";
  data: Buffer;
}) {
  const existing = await prisma.attachment.findFirst({
    where: { jobId: input.jobId, filename: input.filename },
  });
  if (existing) return existing;
  const key = randomUUID();
  await prisma.storedObject.create({ data: { key, data: input.data } });
  return prisma.attachment.create({
    data: {
      organisationId: input.organisationId,
      jobId: input.jobId,
      certificateId: input.certificateId,
      filename: input.filename,
      mimeType: input.mimeType,
      storageKey: key,
      kind: input.kind,
      sizeBytes: input.data.length,
    },
  });
}

async function ensureInvoice(data: {
  organisationId: string;
  externalRef: string;
  jobId?: string;
  jobNumber?: string;
  customerName: string;
  description: string;
  status: string;
  issuedAt: Date;
  dueAt: Date;
  totalCents: number;
  balanceCents: number;
}) {
  const existing = await prisma.invoice.findFirst({
    where: { organisationId: data.organisationId, externalRef: data.externalRef },
  });
  if (existing) return prisma.invoice.update({ where: { id: existing.id }, data });
  return prisma.invoice.create({ data: { ...data, currency: "ZAR", source: "quickbooks" } });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
