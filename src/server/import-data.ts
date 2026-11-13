import { prisma } from "@/lib/db";
import { parseInvoiceCsv, parseJobCsv, type ImportIssue } from "@/lib/csv";
import type { Actor } from "@/server/actor";
import { assertAdmin } from "@/server/actor";

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: ImportIssue[];
};

export async function importJobsCsv(actor: Actor, csv: string): Promise<ImportResult> {
  assertAdmin(actor);
  const parsed = parseJobCsv(csv);
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [...parsed.errors] };
  const organisations = new Map<string, { id: string } | null>();

  for (const row of parsed.rows) {
    const organisation = await findOrganisation(organisations, row.customer);
    if (!organisation) {
      result.skipped += 1;
      result.errors.push({
        row: row.row,
        message: `No client organisation named "${row.customer}". Create the client first, then import again.`,
      });
      continue;
    }

    const site = await findOrCreateSite(organisation.id, row.siteName, row.siteAddress);
    const existing = row.jobNumber
      ? await prisma.job.findFirst({
          where: { organisationId: organisation.id, externalRef: row.jobNumber },
        })
      : await prisma.job.findFirst({
          where: { organisationId: organisation.id, importKey: row.importKey },
        });

    const data = {
      ...(site ? { siteId: site.id } : {}),
      title: row.title,
      description: row.description,
      status: row.status,
      scheduledAt: row.scheduledAt,
      completedAt: row.completedAt,
      team: row.team,
      externalRef: row.jobNumber,
      importKey: row.jobNumber ? null : row.importKey,
      source: "tradify",
    };

    if (existing) {
      await prisma.job.update({ where: { id: existing.id }, data });
      result.updated += 1;
    } else {
      await prisma.job.create({
        data: { ...data, organisationId: organisation.id },
      });
      result.created += 1;
    }
  }

  return result;
}

export async function importInvoicesCsv(actor: Actor, csv: string): Promise<ImportResult> {
  assertAdmin(actor);
  const parsed = parseInvoiceCsv(csv);
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [...parsed.errors] };
  const organisations = new Map<string, { id: string } | null>();

  for (const row of parsed.rows) {
    const organisation = await findOrganisation(organisations, row.customer);
    if (!organisation) {
      result.skipped += 1;
      result.errors.push({
        row: row.row,
        message: `No client organisation named "${row.customer}". Create the client first, then import again.`,
      });
      continue;
    }

    const job = row.jobNumber
      ? await prisma.job.findFirst({
          where: { organisationId: organisation.id, externalRef: row.jobNumber },
          select: { id: true },
        })
      : null;

    const data = {
      jobId: job?.id ?? null,
      jobNumber: row.jobNumber,
      customerName: row.customer,
      description: row.memo,
      status: row.status,
      issuedAt: row.issuedAt,
      dueAt: row.dueAt,
      totalCents: row.totalCents,
      balanceCents: row.balanceCents,
      currency: "ZAR",
      source: "quickbooks",
    };

    const existing = await prisma.invoice.findFirst({
      where: { organisationId: organisation.id, externalRef: row.invoiceNumber },
    });
    if (existing) {
      await prisma.invoice.update({ where: { id: existing.id }, data });
      result.updated += 1;
    } else {
      await prisma.invoice.create({
        data: { ...data, organisationId: organisation.id, externalRef: row.invoiceNumber },
      });
      result.created += 1;
    }
  }

  return result;
}

async function findOrganisation(cache: Map<string, { id: string } | null>, name: string) {
  const key = name.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;
  const organisation = await prisma.organisation.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  cache.set(key, organisation);
  return organisation;
}

async function findOrCreateSite(organisationId: string, name: string | null, address: string | null) {
  if (!name) return null;
  const existing = await prisma.site.findFirst({
    where: { organisationId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    if (address && existing.address === "Address not supplied") {
      return prisma.site.update({ where: { id: existing.id }, data: { address } });
    }
    return existing;
  }
  return prisma.site.create({
    data: {
      organisationId,
      name,
      address: address || "Address not supplied",
    },
  });
}
