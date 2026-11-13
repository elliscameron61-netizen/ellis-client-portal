/**
 * Files are stored in Postgres so the portal can run on hosts with no persistent disk.
 * To move large files to object storage later, keep the Attachment rows and replace
 * saveStoredFile / readStoredFile with the bucket client.
 */
import { randomUUID } from "crypto";
import type { AttachmentKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safeFilename } from "@/lib/format";
import { ValidationError } from "@/server/errors";

const MAX_BYTES = 8 * 1024 * 1024;

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export function assertAllowedFile(kind: AttachmentKind, mimeType: string, sizeBytes: number): void {
  if (sizeBytes <= 0) throw new ValidationError("Choose a file to attach.");
  if (sizeBytes > MAX_BYTES) throw new ValidationError("Files must be 8 MB or smaller.");
  const allowed = kind === "PHOTO" ? PHOTO_TYPES : DOCUMENT_TYPES;
  if (!allowed.has(mimeType)) {
    throw new ValidationError(
      kind === "PHOTO"
        ? "Photos must be JPEG, PNG, WEBP or GIF."
        : "Documents must be PDF, JPEG, PNG or WEBP.",
    );
  }
}

export async function saveStoredFile(input: {
  filename: string;
  mimeType: string;
  data: Buffer;
  kind: AttachmentKind;
  organisationId: string;
  jobId?: string;
  certificateId?: string;
  faultRequestId?: string;
}) {
  assertAllowedFile(input.kind, input.mimeType, input.data.length);
  const key = randomUUID();
  await prisma.storedObject.create({
    data: { key, data: new Uint8Array(input.data) },
  });
  return prisma.attachment.create({
    data: {
      organisationId: input.organisationId,
      jobId: input.jobId,
      certificateId: input.certificateId,
      faultRequestId: input.faultRequestId,
      filename: safeFilename(input.filename),
      mimeType: input.mimeType,
      storageKey: key,
      kind: input.kind,
      sizeBytes: input.data.length,
    },
  });
}

export async function readStoredFile(storageKey: string): Promise<Buffer | null> {
  const object = await prisma.storedObject.findUnique({ where: { key: storageKey } });
  if (!object) return null;
  return Buffer.from(object.data);
}

export async function fileFromForm(file: FormDataEntryValue | null): Promise<{
  filename: string;
  mimeType: string;
  data: Buffer;
} | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const data = Buffer.from(await file.arrayBuffer());
  return {
    filename: file.name || "upload",
    mimeType: file.type || "application/octet-stream",
    data,
  };
}
