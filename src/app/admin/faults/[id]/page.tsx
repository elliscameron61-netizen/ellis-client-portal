import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { formatDateTime, faultStatusLabel, priorityLabel } from "@/lib/format";
import { updateFaultAction } from "@/server/actions/admin";
import { getFault } from "@/server/portal-data";
import { requireAdminActor } from "@/server/session";

export const metadata = { title: "Fault request" };

export default async function FaultPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminActor();
  const { id } = await params;
  const fault = await getFault(actor, id);
  if (!fault) notFound();
  const photos = fault.attachments.filter((file) => file.kind === "PHOTO");

  return (
    <main className="page" id="main">
      <p>
        <a href="/admin/faults">Fault requests</a>
      </p>
      <h1>
        {fault.organisation.name} · {fault.site.name}
      </h1>
      <p className="lede">
        {priorityLabel(fault.priority)} priority · {faultStatusLabel(fault.status)} · {fault.createdBy.name} (
        {fault.createdBy.email}) · {formatDateTime(fault.createdAt)}
      </p>
      <section className="panel">
        <h2>Description</h2>
        <p>{fault.description}</p>
        {photos.length > 0 ? (
          <div className="media-grid">
            {photos.map((photo) => (
              <figure key={photo.id}>
                <img src={`/api/files/${photo.id}`} alt={photo.filename} />
                <figcaption>{photo.filename}</figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </section>
      <section className="panel">
        <h2>Update the queue</h2>
        <ActionForm action={updateFaultAction} submitLabel="Save status">
          <input type="hidden" name="faultId" value={fault.id} />
          <Field label="Status">
            <select name="status" defaultValue={fault.status}>
              <option value="NEW">New</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="CLOSED">Closed</option>
            </select>
          </Field>
        </ActionForm>
      </section>
    </main>
  );
}
