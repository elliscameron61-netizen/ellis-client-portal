import type { Certificate, Job, Site } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isOpenJob } from "@/lib/format";
import type { Actor } from "@/server/actor";
import { assertAdmin, clientOrganisationId, organisationWhere } from "@/server/actor";
import { AccessError, ValidationError } from "@/server/errors";
import { appUrl } from "@/lib/env";
import { notifyAdmins } from "@/server/notifications";
import { assertAllowedFile, saveStoredFile } from "@/server/storage";
import type { AttachmentKind, FaultPriority, FaultStatus } from "@prisma/client";

const jobInclude = {
  site: true,
  organisation: true,
} as const;

export async function listOrganisations(actor: Actor) {
  assertAdmin(actor);
  return prisma.organisation.findMany({
    include: {
      _count: { select: { sites: true, users: true, jobs: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getOrganisation(actor: Actor, id: string) {
  assertAdmin(actor);
  return prisma.organisation.findUnique({
    where: { id },
    include: {
      sites: { orderBy: { name: "asc" } },
      users: { orderBy: { name: "asc" } },
      jobs: { include: { site: true }, orderBy: { updatedAt: "desc" }, take: 20 },
    },
  });
}

export async function createOrganisation(
  actor: Actor,
  input: {
    name: string;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    notes?: string | null;
    portalEnabled: boolean;
  },
) {
  assertAdmin(actor);
  const name = input.name.trim();
  if (name.length < 2) throw new ValidationError("Enter the organisation name.");
  const existing = await prisma.organisation.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) throw new ValidationError("A client with that name already exists.");
  return prisma.organisation.create({
    data: {
      name,
      contactName: emptyToNull(input.contactName),
      contactEmail: emptyToNull(input.contactEmail)?.toLowerCase() ?? null,
      contactPhone: emptyToNull(input.contactPhone),
      notes: emptyToNull(input.notes),
      portalEnabled: input.portalEnabled,
    },
  });
}

export async function updateOrganisation(
  actor: Actor,
  id: string,
  input: {
    portalEnabled?: boolean;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    notes?: string | null;
  },
) {
  assertAdmin(actor);
  const organisation = await prisma.organisation.findUnique({ where: { id } });
  if (!organisation) throw new ValidationError("That client was not found.");
  return prisma.organisation.update({
    where: { id },
    data: {
      portalEnabled: input.portalEnabled,
      contactName: input.contactName === undefined ? undefined : emptyToNull(input.contactName),
      contactEmail:
        input.contactEmail === undefined ? undefined : emptyToNull(input.contactEmail)?.toLowerCase() ?? null,
      contactPhone: input.contactPhone === undefined ? undefined : emptyToNull(input.contactPhone),
      notes: input.notes === undefined ? undefined : emptyToNull(input.notes),
    },
  });
}

export async function createSite(
  actor: Actor,
  input: { organisationId: string; name: string; address: string; contactName?: string | null },
) {
  assertAdmin(actor);
  const name = input.name.trim();
  const address = input.address.trim();
  if (name.length < 2) throw new ValidationError("Enter the site name.");
  if (address.length < 4) throw new ValidationError("Enter the site address.");
  const organisation = await prisma.organisation.findUnique({ where: { id: input.organisationId } });
  if (!organisation) throw new ValidationError("That client was not found.");
  const duplicate = await prisma.site.findFirst({
    where: { organisationId: organisation.id, name: { equals: name, mode: "insensitive" } },
  });
  if (duplicate) throw new ValidationError("That site already exists for this client.");
  return prisma.site.create({
    data: {
      organisationId: organisation.id,
      name,
      address,
      contactName: emptyToNull(input.contactName),
    },
  });
}

export async function listUsers(actor: Actor) {
  assertAdmin(actor);
  return prisma.user.findMany({
    include: { organisation: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

function summarizeSite<T extends Site & { jobs: Job[]; certificates: Certificate[] }>(site: T) {
  const openJobs = site.jobs.filter((job) => isOpenJob(job.status)).length;
  const visitDates = site.jobs
    .flatMap((job) => [job.completedAt, job.scheduledAt])
    .filter((value): value is Date => value instanceof Date && value.getTime() <= Date.now())
    .sort((a, b) => b.getTime() - a.getTime());
  const cocDates = site.certificates
    .map((certificate) => certificate.expiresAt)
    .filter((value): value is Date => value instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime());
  const future = cocDates.filter((date) => date.getTime() >= Date.now());
  const nextCoc = future[0] ?? cocDates[cocDates.length - 1] ?? null;
  return {
    ...site,
    openJobs,
    lastVisit: visitDates[0] ?? null,
    nextCoc,
    nextCocOverdue: Boolean(nextCoc && nextCoc.getTime() < Date.now()),
  };
}

export async function listSiteSummaries(actor: Actor, organisationId?: string) {
  const where = organisationWhere(actor, organisationId);
  const sites = await prisma.site.findMany({
    where,
    include: {
      jobs: true,
      certificates: true,
      organisation: true,
    },
    orderBy: { name: "asc" },
  });
  return sites.map(summarizeSite);
}

export async function getSite(actor: Actor, id: string) {
  const site = await prisma.site.findFirst({
    where: { id, ...organisationWhere(actor) },
    include: {
      organisation: true,
      jobs: { orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }] },
      certificates: true,
    },
  });
  return site ? summarizeSite(site) : null;
}

export async function listJobs(actor: Actor, options?: { organisationId?: string; siteId?: string }) {
  if (actor.role === "CLIENT" && options?.siteId) {
    const site = await prisma.site.findFirst({
      where: { id: options.siteId, organisationId: clientOrganisationId(actor) },
      select: { id: true },
    });
    if (!site) return [];
  }
  return prisma.job.findMany({
    where: {
      ...organisationWhere(actor, options?.organisationId),
      ...(options?.siteId ? { siteId: options.siteId } : {}),
    },
    include: jobInclude,
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getJob(actor: Actor, id: string) {
  return prisma.job.findFirst({
    where: { id, ...organisationWhere(actor) },
    include: {
      ...jobInclude,
      notes: {
        where: actor.role === "ADMIN" ? {} : { visibility: "client" },
        orderBy: { createdAt: "desc" },
      },
      attachments: { orderBy: { createdAt: "desc" } },
      resources: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      certificates: { include: { attachments: true }, orderBy: { issuedAt: "desc" } },
    },
  });
}

export async function createManualJob(
  actor: Actor,
  input: { organisationId: string; siteId?: string | null; title: string; status?: string | null; team?: string | null },
) {
  assertAdmin(actor);
  const title = input.title.trim();
  if (title.length < 2) throw new ValidationError("Enter a job title.");
  const organisation = await prisma.organisation.findUnique({ where: { id: input.organisationId } });
  if (!organisation) throw new ValidationError("That client was not found.");
  let siteId: string | null = null;
  if (input.siteId) {
    const site = await prisma.site.findFirst({
      where: { id: input.siteId, organisationId: organisation.id },
    });
    if (!site) throw new ValidationError("Choose a site that belongs to this client.");
    siteId = site.id;
  }
  return prisma.job.create({
    data: {
      organisationId: organisation.id,
      siteId,
      title,
      status: input.status?.trim() || "Scheduled",
      team: emptyToNull(input.team),
      source: "manual",
    },
  });
}

export async function addJobNote(
  actor: Actor,
  input: { jobId: string; body: string; visibility: "client" | "internal" },
) {
  assertAdmin(actor);
  const body = input.body.trim();
  if (body.length < 2) throw new ValidationError("Enter the note.");
  const job = await prisma.job.findUnique({ where: { id: input.jobId } });
  if (!job) throw new ValidationError("That job was not found.");
  return prisma.jobNote.create({
    data: {
      jobId: job.id,
      body,
      authorName: actor.name,
      visibility: input.visibility === "internal" ? "internal" : "client",
    },
  });
}

export async function addJobResource(
  actor: Actor,
  input: { jobId: string; kind: "video" | "faq"; title: string; body?: string | null; url?: string | null },
) {
  assertAdmin(actor);
  const job = await prisma.job.findUnique({ where: { id: input.jobId } });
  if (!job) throw new ValidationError("That job was not found.");
  const title = input.title.trim();
  if (title.length < 2) throw new ValidationError("Enter a title.");
  if (input.kind === "video") {
    const url = input.url?.trim() ?? "";
    if (!/^https:\/\/\S+$/i.test(url)) throw new ValidationError("Enter an https link for the video.");
    return prisma.jobResource.create({
      data: { jobId: job.id, kind: "video", title, url, body: emptyToNull(input.body) },
    });
  }
  const answer = input.body?.trim() ?? "";
  if (answer.length < 2) throw new ValidationError("Enter the answer.");
  return prisma.jobResource.create({
    data: { jobId: job.id, kind: "faq", title, body: answer },
  });
}

export async function attachToJob(
  actor: Actor,
  input: {
    jobId: string;
    kind: AttachmentKind;
    filename: string;
    mimeType: string;
    data: Buffer;
    certificateNumber?: string | null;
    issuedAt?: Date | null;
    expiresAt?: Date | null;
  },
) {
  assertAdmin(actor);
  const job = await prisma.job.findUnique({ where: { id: input.jobId } });
  if (!job) throw new ValidationError("That job was not found.");
  assertAllowedFile(input.kind, input.mimeType, input.data.length);

  let certificateId: string | undefined;
  if (input.kind === "COC") {
    const number = emptyToNull(input.certificateNumber);
    const certificate = await prisma.certificate.create({
      data: {
        organisationId: job.organisationId,
        siteId: job.siteId,
        jobId: job.id,
        type: "COC",
        number,
        title: number ? `Certificate of Compliance ${number}` : "Certificate of Compliance",
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
      },
    });
    certificateId = certificate.id;
  }

  return saveStoredFile({
    filename: input.filename,
    mimeType: input.mimeType,
    data: input.data,
    kind: input.kind,
    organisationId: job.organisationId,
    jobId: job.id,
    certificateId,
  });
}

export async function deleteAttachment(actor: Actor, id: string) {
  assertAdmin(actor);
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) return;
  await prisma.attachment.delete({ where: { id } });
  const remaining = await prisma.attachment.count({ where: { storageKey: attachment.storageKey } });
  if (remaining === 0) {
    await prisma.storedObject.deleteMany({ where: { key: attachment.storageKey } });
  }
}

export async function listInvoices(actor: Actor, organisationId?: string) {
  return prisma.invoice.findMany({
    where: organisationWhere(actor, organisationId),
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getInvoice(actor: Actor, id: string) {
  return prisma.invoice.findFirst({
    where: { id, ...organisationWhere(actor) },
  });
}

export async function listCertificates(actor: Actor, organisationId?: string) {
  return prisma.certificate.findMany({
    where: organisationWhere(actor, organisationId),
    include: { site: true, job: true, attachments: true, organisation: true },
    orderBy: [{ expiresAt: "asc" }, { issuedAt: "desc" }],
  });
}

export async function getAttachmentForActor(actor: Actor, id: string) {
  return prisma.attachment.findFirst({
    where: { id, ...organisationWhere(actor) },
  });
}

export async function listFaults(actor: Actor, status?: FaultStatus) {
  return prisma.faultRequest.findMany({
    where: {
      ...organisationWhere(actor),
      ...(status ? { status } : {}),
    },
    include: {
      site: true,
      organisation: true,
      createdBy: true,
      attachments: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFault(actor: Actor, id: string) {
  return prisma.faultRequest.findFirst({
    where: { id, ...organisationWhere(actor) },
    include: {
      site: true,
      organisation: true,
      createdBy: true,
      attachments: true,
    },
  });
}

export async function createFault(
  actor: Actor,
  input: {
    siteId: string;
    description: string;
    priority: FaultPriority;
    photos: { filename: string; mimeType: string; data: Buffer }[];
  },
) {
  const organisationId = clientOrganisationId(actor);
  const description = input.description.trim();
  if (description.length < 10) throw new ValidationError("Describe the fault in a sentence or two.");
  if (description.length > 5000) throw new ValidationError("That description is too long.");
  if (!["LOW", "NORMAL", "HIGH"].includes(input.priority)) {
    throw new ValidationError("Choose a priority.");
  }
  if (input.photos.length > 5) throw new ValidationError("You can attach up to 5 photos.");
  for (const photo of input.photos) {
    assertAllowedFile("PHOTO", photo.mimeType, photo.data.length);
  }

  const site = await prisma.site.findFirst({
    where: { id: input.siteId, organisationId },
    include: { organisation: true },
  });
  if (!site) throw new AccessError("Choose a site that belongs to your organisation.");

  const fault = await prisma.faultRequest.create({
    data: {
      organisationId,
      siteId: site.id,
      createdById: actor.id,
      description,
      priority: input.priority,
    },
  });

  for (const photo of input.photos) {
    await saveStoredFile({
      ...photo,
      kind: "PHOTO",
      organisationId,
      faultRequestId: fault.id,
    });
  }

  const priorityText = input.priority === "HIGH" ? "High" : input.priority === "LOW" ? "Low" : "Normal";
  try {
    await notifyAdmins(
    `Fault request: ${site.organisation.name} — ${site.name}`,
    [
      "A client logged a fault in the portal.",
      "",
      `Organisation: ${site.organisation.name}`,
      `Site: ${site.name}`,
      `Priority: ${priorityText}`,
      `Logged by: ${actor.name} (${actor.email})`,
      "",
      "Description:",
      description,
      "",
      `Open the request: ${appUrl()}/admin/faults/${fault.id}`,
      "",
      "Ellis Electrical client portal",
    ].join("\n"),
    );
  } catch (error) {
    console.error("Fault notification failed", error);
  }

  return fault;
}

export async function updateFaultStatus(actor: Actor, id: string, status: FaultStatus) {
  assertAdmin(actor);
  const fault = await prisma.faultRequest.findUnique({ where: { id } });
  if (!fault) throw new ValidationError("That request was not found.");
  return prisma.faultRequest.update({ where: { id }, data: { status } });
}

export async function adminOverview(actor: Actor) {
  assertAdmin(actor);
  const [organisations, jobs, invoices, newFaults, recentFaults] = await Promise.all([
    prisma.organisation.findMany({ select: { portalEnabled: true } }),
    prisma.job.findMany({ select: { status: true } }),
    prisma.invoice.findMany({ select: { balanceCents: true } }),
    prisma.faultRequest.count({ where: { status: "NEW" } }),
    prisma.faultRequest.findMany({
      include: { organisation: true, site: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);
  const outstandingCents = invoices.reduce((sum, invoice) => sum + Math.max(invoice.balanceCents, 0), 0);
  return {
    organisationCount: organisations.length,
    portalCount: organisations.filter((organisation) => organisation.portalEnabled).length,
    openJobs: jobs.filter((job) => isOpenJob(job.status)).length,
    outstandingCents,
    newFaults,
    recentFaults,
  };
}

export async function listMessages(actor: Actor) {
  assertAdmin(actor);
  return prisma.emailMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}
