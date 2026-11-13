import { NextResponse } from "next/server";
import { safeFilename } from "@/lib/format";
import { getAttachmentForActor } from "@/server/portal-data";
import { readSession } from "@/server/session";
import { readStoredFile } from "@/server/storage";

const INLINE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (session.status !== "ok") {
    return new NextResponse("Sign in required", { status: 401 });
  }
  const { id } = await context.params;
  const attachment = await getAttachmentForActor(session.actor, id);
  if (!attachment) return new NextResponse("Not found", { status: 404 });
  const data = await readStoredFile(attachment.storageKey);
  if (!data) return new NextResponse("Not found", { status: 404 });
  const filename = safeFilename(attachment.filename);
  const inline = INLINE.has(attachment.mimeType);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
