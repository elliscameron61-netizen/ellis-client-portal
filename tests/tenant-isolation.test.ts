import { readFileSync } from "fs";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { Actor } from "@/server/actor";
import { AccessError } from "@/server/errors";
import { importInvoicesCsv, importJobsCsv } from "@/server/import-data";
import {
  createFault,
  createOrganisation,
  getAttachmentForActor,
  getInvoice,
  getJob,
  getSite,
  listCertificates,
  listFaults,
  listInvoices,
  listJobs,
} from "@/server/portal-data";
import { saveStoredFile } from "@/server/storage";
import { createOrganisation as insertOrg, createSite, createUser, resetDatabase } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
});

async function twoClients() {
  const orgA = await insertOrg("Org A");
  const orgB = await insertOrg("Org B");
  const siteA = await createSite(orgA.id, "Site A");
  const siteB = await createSite(orgB.id, "Site B");
  const userA = await createUser({
    email: "a@org-a.test",
    name: "User A",
    role: "CLIENT",
    organisationId: orgA.id,
  });
  const admin = await createUser({
    email: "admin@elliselectrical.example",
    name: "Admin",
    role: "ADMIN",
  });
  const jobA = await prisma.job.create({
    data: {
      organisationId: orgA.id,
      siteId: siteA.id,
      externalRef: "EE-1",
      title: "Job A",
      status: "Scheduled",
      notes: {
        create: [
          { body: "Client note", authorName: "Staff", visibility: "client" },
          { body: "Secret note", authorName: "Staff", visibility: "internal" },
        ],
      },
    },
  });
  const jobB = await prisma.job.create({
    data: {
      organisationId: orgB.id,
      siteId: siteB.id,
      externalRef: "EE-1",
      title: "Job B",
      status: "Completed",
    },
  });
  const invoiceA = await prisma.invoice.create({
    data: {
      organisationId: orgA.id,
      externalRef: "INV-A",
      status: "Open",
      totalCents: 10000,
      balanceCents: 10000,
    },
  });
  const invoiceB = await prisma.invoice.create({
    data: {
      organisationId: orgB.id,
      externalRef: "INV-B",
      status: "Paid",
      totalCents: 5000,
      balanceCents: 0,
    },
  });
  await prisma.certificate.create({
    data: { organisationId: orgA.id, siteId: siteA.id, jobId: jobA.id, title: "COC A", number: "A" },
  });
  await prisma.certificate.create({
    data: { organisationId: orgB.id, siteId: siteB.id, jobId: jobB.id, title: "COC B", number: "B" },
  });
  const fileB = await saveStoredFile({
    organisationId: orgB.id,
    jobId: jobB.id,
    filename: "secret.pdf",
    mimeType: "application/pdf",
    kind: "DOCUMENT",
    data: Buffer.from("%PDF-1.4 example"),
  });

  const actorA: Actor = {
    id: userA.id,
    email: userA.email,
    name: userA.name,
    role: "CLIENT",
    organisationId: orgA.id,
    organisationName: orgA.name,
  };
  const actorAdmin: Actor = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: "ADMIN",
    organisationId: null,
    organisationName: null,
  };

  return { orgA, orgB, siteA, siteB, jobA, jobB, invoiceA, invoiceB, fileB, actorA, actorAdmin };
}

describe("tenant isolation", () => {
  it("does not let a client read another organisation", async () => {
    const { actorA, actorAdmin, jobA, jobB, invoiceB, siteB, fileB } = await twoClients();

    const jobs = await listJobs(actorA, { organisationId: jobB.organisationId, siteId: siteB.id });
    expect(jobs.map((job) => job.id)).toEqual([]);

    const ownJobs = await listJobs(actorA, { organisationId: jobB.organisationId });
    expect(ownJobs.map((job) => job.id)).toEqual([jobA.id]);

    expect(await getJob(actorA, jobB.id)).toBeNull();
    const ownJob = await getJob(actorA, jobA.id);
    expect(ownJob?.notes.map((note) => note.body)).toEqual(["Client note"]);

    expect(await getInvoice(actorA, invoiceB.id)).toBeNull();
    expect((await listInvoices(actorA, jobB.organisationId)).map((invoice) => invoice.externalRef)).toEqual(["INV-A"]);
    expect(await getSite(actorA, siteB.id)).toBeNull();
    expect((await listCertificates(actorA)).map((certificate) => certificate.number)).toEqual(["A"]);
    expect(await getAttachmentForActor(actorA, fileB.id)).toBeNull();

    const adminJob = await getJob(actorAdmin, jobB.id);
    expect(adminJob?.title).toBe("Job B");
    expect(await getAttachmentForActor(actorAdmin, fileB.id)).not.toBeNull();
    await expect(
      createOrganisation(actorA, { name: "Should fail", portalEnabled: true }),
    ).rejects.toBeInstanceOf(AccessError);
  });

  it("rejects a fault logged against another organisation's site and emails admins for a valid one", async () => {
    const { actorA, siteA, siteB } = await twoClients();
    await expect(
      createFault(actorA, {
        siteId: siteB.id,
        description: "This description is long enough to submit.",
        priority: "HIGH",
        photos: [],
      }),
    ).rejects.toBeInstanceOf(AccessError);
    expect(await prisma.faultRequest.count()).toBe(0);

    const fault = await createFault(actorA, {
      siteId: siteA.id,
      description: "The passage light on level two is flickering.",
      priority: "NORMAL",
      photos: [],
    });
    expect((await listFaults(actorA)).map((item) => item.id)).toEqual([fault.id]);
    const message = await prisma.emailMessage.findFirst({ where: { subject: { contains: "Fault request" } } });
    expect(message?.toAddress).toBe("admin@elliselectrical.example");
    expect(message?.body).toContain("Site A");
    expect(message?.body).not.toMatch(/fast response/i);
  });

  it("imports sample rows into the matching organisation only", async () => {
    const property = await insertOrg("Example Property Management");
    const hotel = await insertOrg("Example Hotel Group");
    await prisma.job.create({
      data: {
        organisationId: property.id,
        externalRef: "EE-2003",
        title: "Property job that must not receive the hotel invoice",
        status: "Scheduled",
      },
    });
    const admin = await createUser({ email: "importer@elliselectrical.example", name: "Importer", role: "ADMIN" });
    const actor = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: "ADMIN" as const,
      organisationId: null,
      organisationName: null,
    };

    const jobs = await importJobsCsv(actor, readFileSync("samples/tradify-jobs.sample.csv", "utf8"));
    expect(jobs.created).toBe(3);
    expect(jobs.skipped).toBe(1);
    expect(jobs.errors.some((issue) => issue.message.includes("Unknown Customer"))).toBe(true);

    const unnumbered = await prisma.job.findFirst({
      where: { title: { contains: "isolator label" } },
    });
    expect(unnumbered?.externalRef).toBeNull();
    expect(unnumbered?.organisationId).toBe(property.id);
    expect(unnumbered?.importKey).toBeTruthy();

    const again = await importJobsCsv(actor, readFileSync("samples/tradify-jobs.sample.csv", "utf8"));
    expect(again.updated).toBe(3);
    expect(await prisma.job.count({ where: { title: { contains: "isolator label" } } })).toBe(1);

    const invoices = await importInvoicesCsv(actor, readFileSync("samples/quickbooks-invoices.sample.csv", "utf8"));
    expect(invoices.created).toBe(3);
    expect(invoices.skipped).toBe(1);

    const hotelInvoice = await prisma.invoice.findFirstOrThrow({ where: { externalRef: "INV-EX-5002" } });
    expect(hotelInvoice.organisationId).toBe(hotel.id);
    const hotelJob = await prisma.job.findFirstOrThrow({
      where: { organisationId: hotel.id, externalRef: "EE-2003" },
    });
    expect(hotelInvoice.jobId).toBe(hotelJob.id);

    const noJob = await prisma.invoice.findFirstOrThrow({ where: { externalRef: "INV-EX-5003" } });
    expect(noJob.jobNumber).toBeNull();
    expect(noJob.balanceCents).toBe(62525);
    expect(noJob.organisationId).toBe(property.id);
  });
});
