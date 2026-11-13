"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import type { FaultPriority } from "@prisma/client";
import { actionFailure, rethrowIfRedirect } from "@/server/action-failure";
import { createFault } from "@/server/portal-data";
import { fileFromForm } from "@/server/storage";
import { requireClientActor } from "@/server/session";

export async function logFaultAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireClientActor();
  try {
    const priorityValue = String(formData.get("priority") ?? "NORMAL");
    const priority: FaultPriority =
      priorityValue === "LOW" || priorityValue === "HIGH" ? priorityValue : "NORMAL";
    const photos: { filename: string; mimeType: string; data: Buffer }[] = [];
    for (const entry of formData.getAll("photos")) {
      const file = await fileFromForm(entry);
      if (file) photos.push(file);
    }
    await createFault(actor, {
      siteId: String(formData.get("siteId") ?? ""),
      description: String(formData.get("description") ?? ""),
      priority,
      photos,
    });
    redirect("/portal/faults?sent=1");
  } catch (error) {
    rethrowIfRedirect(error);
    return actionFailure(error);
  }
}
