import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Field, StatusPill } from "@/components/ui";
import { formatDate, formatDateTime, jobNumberLabel } from "@/lib/format";
import {
  addFaqAction,
  addNoteAction,
  addVideoAction,
  attachFileAction,
  deleteAttachmentAction,
} from "@/server/actions/admin";
import { getJob } from "@/server/portal-data";
import { requireAdminActor } from "@/server/session";

export const metadata = { title: "Job" };

export default async function AdminJobPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminActor();
  const { id } = await params;
  const job = await getJob(actor, id);
  if (!job) notFound();

  return (
    <main className="page" id="main">
      <p>
        <a href="/admin/jobs">Jobs</a> · <a href={`/admin/organisations/${job.organisationId}`}>{job.organisation.name}</a>
      </p>
      <div className="page-head">
        <div>
          <h1>{job.title}</h1>
          <p className="lede">
            {jobNumberLabel(job.externalRef)}
            {job.site ? ` · ${job.site.name}` : ""} · {formatDate(job.scheduledAt ?? job.completedAt)}
            {job.team ? ` · ${job.team}` : ""}
          </p>
        </div>
        <StatusPill status={job.status} />
      </div>
      {job.description ? <section className="panel"><p>{job.description}</p></section> : null}
      <div className="grid-2">
        <div>
          <section className="panel">
            <h2>Notes</h2>
            {job.notes.map((note) => (
              <article key={note.id} className="faq">
                <strong>{note.visibility === "internal" ? "Staff only" : "Visible to the client"}</strong>
                <p>{note.body}</p>
                <p className="muted">
                  {note.authorName} · {formatDateTime(note.createdAt)}
                </p>
              </article>
            ))}
            <ActionForm action={addNoteAction} submitLabel="Add note">
              <input type="hidden" name="jobId" value={job.id} />
              <Field label="Note">
                <textarea name="body" required />
              </Field>
              <Field label="Who can see it">
                <select name="visibility" defaultValue="client">
                  <option value="client">Client and Ellis staff</option>
                  <option value="internal">Ellis staff only</option>
                </select>
              </Field>
            </ActionForm>
          </section>
          <section className="panel">
            <h2>Files</h2>
            {job.attachments.map((file) => (
              <div className="file-row" key={file.id}>
                <div>
                  <a href={`/api/files/${file.id}`}>{file.filename}</a>
                  <div className="muted">{file.kind === "COC" ? "Certificate" : file.kind === "PHOTO" ? "Photo" : "Document"}</div>
                </div>
                <form action={deleteAttachmentAction}>
                  <input type="hidden" name="attachmentId" value={file.id} />
                  <input type="hidden" name="returnTo" value={`/admin/jobs/${job.id}`} />
                  <button className="btn btn-small btn-danger" type="submit">
                    Remove
                  </button>
                </form>
              </div>
            ))}
            <ActionForm action={attachFileAction} submitLabel="Attach file" multipart>
              <input type="hidden" name="jobId" value={job.id} />
              <Field label="File" hint="Photos: JPEG, PNG, WEBP or GIF. Documents and COCs: PDF or image. 8 MB maximum.">
                <input name="file" type="file" required />
              </Field>
              <Field label="Kind">
                <select name="kind" defaultValue="DOCUMENT">
                  <option value="PHOTO">Photo</option>
                  <option value="DOCUMENT">Document</option>
                  <option value="COC">Certificate of compliance</option>
                </select>
              </Field>
              <Field label="Certificate number" hint="Used when the file is a certificate.">
                <input name="certificateNumber" />
              </Field>
              <Field label="Issued">
                <input name="issuedAt" type="date" />
              </Field>
              <Field label="Next COC due">
                <input name="expiresAt" type="date" />
              </Field>
            </ActionForm>
          </section>
        </div>
        <div>
          <section className="panel">
            <h2>How-to video</h2>
            {job.resources
              .filter((resource) => resource.kind === "video")
              .map((resource) => (
                <p key={resource.id}>
                  <a href={resource.url ?? "#"} target="_blank" rel="noreferrer">
                    {resource.title}
                  </a>
                </p>
              ))}
            <ActionForm action={addVideoAction} submitLabel="Add video link">
              <input type="hidden" name="jobId" value={job.id} />
              <Field label="Title" hint="For example: How to program your timer">
                <input name="title" required />
              </Field>
              <Field label="HTTPS link">
                <input name="url" type="url" required placeholder="https://" />
              </Field>
              <Field label="Short description">
                <textarea name="body" />
              </Field>
            </ActionForm>
          </section>
          <section className="panel">
            <h2>FAQ</h2>
            {job.resources
              .filter((resource) => resource.kind === "faq")
              .map((resource) => (
                <details key={resource.id} className="faq">
                  <summary>{resource.title}</summary>
                  <p>{resource.body}</p>
                </details>
              ))}
            <ActionForm action={addFaqAction} submitLabel="Add FAQ">
              <input type="hidden" name="jobId" value={job.id} />
              <Field label="Question">
                <input name="title" required />
              </Field>
              <Field label="Answer">
                <textarea name="body" required />
              </Field>
            </ActionForm>
          </section>
        </div>
      </div>
    </main>
  );
}
