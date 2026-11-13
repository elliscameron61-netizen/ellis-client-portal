"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { parseDate } from "@/lib/csv";
import type { AttachmentKind, FaultStatus } from "@prisma/client";
import { actionFailure, rethrowIfRedirect } from "@/server/action-failure";
import { createInvite, setUserDisabled } from "@/server/auth";
import { importInvoicesCsv, importJobsCsv } from "@/server/import-data";
import {
  addJobNote,
  addJobResource,
  attachToJob,
  createManualJob,
  createOrganisation,
  createSite,
  deleteAttachment,
  updateFaultStatus,
  updateOrganisation,
} from "@/server/portal-data";
import { fileFromForm } from "@/server/storage";
import { requireAdminActor } from "@/server/session";
import { ValidationError } from "@/server/errors";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalDate(formData: FormData, key: string): Date | null {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = parseDate(value);
  if (!parsed) throw new ValidationError("Enter dates as YYYY-MM-DD or DD/MM/YYYY.");
  return parsed;
}

export async function createClientAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    const organisation = await createOrganisation(actor, {
      name: text(formData, "name"),
      contactName: text(formData, "contactName"),
      contactEmail: text(formData, "contactEmail"),
      contactPhone: text(formData, "contactPhone"),
      notes: text(formData, "notes"),
      portalEnabled: formData.get("portalEnabled") === "yes",
    });
    const siteName = text(formData, "siteName");
    if (siteName) {
      await createSite(actor, {
        organisationId: organisation.id,
        name: siteName,
        address: text(formData, "siteAddress"),
      });
    }
    let link: string | undefined;
    const inviteEmail = text(formData, "inviteEmail");
    if (inviteEmail) {
      const invite = await createInvite({
        email: inviteEmail,
        name: text(formData, "inviteName"),
        role: "CLIENT",
        organisationId: organisation.id,
      });
      link = invite.url;
    }
    return {
      message: `${organisation.name} has been created.`,
      link,
      linkLabel: link ? "Password link for the invited user" : undefined,
      organisationId: organisation.id,
    };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updatePortalAccessAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    await updateOrganisation(actor, text(formData, "organisationId"), {
      portalEnabled: formData.get("portalEnabled") === "yes",
    });
    return { message: "Portal access updated." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateOrganisationAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    await updateOrganisation(actor, text(formData, "organisationId"), {
      contactName: text(formData, "contactName"),
      contactEmail: text(formData, "contactEmail"),
      contactPhone: text(formData, "contactPhone"),
      notes: text(formData, "notes"),
    });
    return { message: "Client details saved." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createSiteAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    await createSite(actor, {
      organisationId: text(formData, "organisationId"),
      name: text(formData, "name"),
      address: text(formData, "address"),
      contactName: text(formData, "contactName"),
    });
    return { message: "Site added." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function inviteUserAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    const role = formData.get("role") === "ADMIN" ? "ADMIN" : "CLIENT";
    const invite = await createInvite({
      email: text(formData, "email"),
      name: text(formData, "name"),
      role,
      organisationId: role === "CLIENT" ? text(formData, "organisationId") : null,
    });
    return {
      message: "Invitation sent.",
      link: invite.url,
      linkLabel: "Password link for the invited user",
    };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function setUserDisabledAction(formData: FormData): Promise<void> {
  const actor = await requireAdminActor();
  const disabled = formData.get("disabled") === "yes";
  await setUserDisabled(text(formData, "userId"), disabled, actor.id);
  revalidatePath("/admin/users");
  revalidatePath("/admin/organisations");
}

export async function createJobAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    const job = await createManualJob(actor, {
      organisationId: text(formData, "organisationId"),
      siteId: text(formData, "siteId") || null,
      title: text(formData, "title"),
      status: text(formData, "status"),
      team: text(formData, "team"),
    });
    redirect(`/admin/jobs/${job.id}`);
  } catch (error) {
    rethrowIfRedirect(error);
    return actionFailure(error);
  }
}

export async function addNoteAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    await addJobNote(actor, {
      jobId: text(formData, "jobId"),
      body: text(formData, "body"),
      visibility: formData.get("visibility") === "internal" ? "internal" : "client",
    });
    return { message: "Note added." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function addVideoAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    await addJobResource(actor, {
      jobId: text(formData, "jobId"),
      kind: "video",
      title: text(formData, "title"),
      url: text(formData, "url"),
      body: text(formData, "body"),
    });
    return { message: "Video link added." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function addFaqAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    await addJobResource(actor, {
      jobId: text(formData, "jobId"),
      kind: "faq",
      title: text(formData, "title"),
      body: text(formData, "body"),
    });
    return { message: "FAQ added." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function attachFileAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    const kindValue = text(formData, "kind");
    const kind: AttachmentKind = kindValue === "PHOTO" || kindValue === "COC" ? kindValue : "DOCUMENT";
    const file = await fileFromForm(formData.get("file"));
    if (!file) throw new ValidationError("Choose a file to attach.");
    await attachToJob(actor, {
      jobId: text(formData, "jobId"),
      kind,
      ...file,
      certificateNumber: text(formData, "certificateNumber"),
      issuedAt: optionalDate(formData, "issuedAt"),
      expiresAt: optionalDate(formData, "expiresAt"),
    });
    return { message: kind === "COC" ? "Certificate attached." : "File attached." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteAttachmentAction(formData: FormData): Promise<void> {
  const actor = await requireAdminActor();
  await deleteAttachment(actor, text(formData, "attachmentId"));
  redirect(text(formData, "returnTo") || "/admin/jobs");
}

export async function importJobsAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    const file = await fileFromForm(formData.get("file"));
    if (!file) throw new ValidationError("Choose a jobs CSV file.");
    if (file.data.length > 2 * 1024 * 1024) throw new ValidationError("CSV files must be 2 MB or smaller.");
    const result = await importJobsCsv(actor, file.data.toString("utf8"));
    return importState("Jobs", result);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function importInvoicesAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    const file = await fileFromForm(formData.get("file"));
    if (!file) throw new ValidationError("Choose an invoices CSV file.");
    if (file.data.length > 2 * 1024 * 1024) throw new ValidationError("CSV files must be 2 MB or smaller.");
    const result = await importInvoicesCsv(actor, file.data.toString("utf8"));
    return importState("Invoices", result);
  } catch (error) {
    return actionFailure(error);
  }
}

function importState(
  label: string,
  result: { created: number; updated: number; skipped: number; errors: { row: number; message: string }[] },
): ActionState {
  return {
    message: `${label}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`,
    details: result.errors.slice(0, 30).map((issue) => `Row ${issue.row}: ${issue.message}`),
  };
}

export async function updateFaultAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminActor();
  try {
    const status = text(formData, "status");
    if (status !== "NEW" && status !== "ACKNOWLEDGED" && status !== "CLOSED") {
      throw new ValidationError("Choose a status.");
    }
    await updateFaultStatus(actor, text(formData, "faultId"), status as FaultStatus);
    return { message: "Request updated." };
  } catch (error) {
    return actionFailure(error);
  }
}
