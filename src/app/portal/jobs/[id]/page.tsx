import { notFound } from "next/navigation";
import { StatusPill } from "@/components/ui";
import { formatDate, formatDateTime, jobNumberLabel } from "@/lib/format";
import { getJob } from "@/server/portal-data";
import { requireClientActor } from "@/server/session";

export const metadata = { title: "Job" };

export default async function ClientJobPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireClientActor();
  const { id } = await params;
  const job = await getJob(actor, id);
  if (!job) notFound();
  const photos = job.attachments.filter((file) => file.kind === "PHOTO");
  const documents = job.attachments.filter((file) => file.kind !== "PHOTO");
  const videos = job.resources.filter((resource) => resource.kind === "video");
  const faqs = job.resources.filter((resource) => resource.kind === "faq");

  return (
    <main className="page" id="main">
      <p>
        {job.site ? <a href={`/portal/sites/${job.site.id}`}>{job.site.name}</a> : <a href="/portal">Sites</a>}
      </p>
      <div className="page-head">
        <div>
          <h1>{job.title}</h1>
          <p className="lede">
            {jobNumberLabel(job.externalRef)} · {formatDate(job.completedAt ?? job.scheduledAt)}
            {job.team ? ` · ${job.team}` : ""}
          </p>
        </div>
        <StatusPill status={job.status} />
      </div>
      {job.description ? (
        <section className="panel">
          <h2>Description</h2>
          <p className="pre">{job.description}</p>
        </section>
      ) : null}
      <section className="panel">
        <h2>Technician notes</h2>
        {job.notes.length === 0 ? <p className="muted">No notes have been added for this job.</p> : null}
        {job.notes.map((note) => (
          <article key={note.id}>
            <p>{note.body}</p>
            <p className="muted">
              {note.authorName} · {formatDateTime(note.createdAt)}
            </p>
          </article>
        ))}
      </section>
      <section className="panel">
        <h2>Photos</h2>
        {photos.length === 0 ? <p className="muted">No photos attached.</p> : null}
        <div className="media-grid">
          {photos.map((photo) => (
            <figure key={photo.id}>
              <a href={`/api/files/${photo.id}`}>
                <img src={`/api/files/${photo.id}`} alt={photo.filename} />
              </a>
              <figcaption>{photo.filename}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Documents</h2>
        {documents.length === 0 ? <p className="muted">No documents attached.</p> : null}
        {documents.map((file) => (
          <div className="file-row" key={file.id}>
            <span>{file.kind === "COC" ? "Certificate" : "Document"}</span>
            <a href={`/api/files/${file.id}`}>{file.filename}</a>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>How-to and troubleshooting</h2>
        {videos.length === 0 ? <p className="muted">No video links on this job.</p> : null}
        {videos.map((video) => (
          <article key={video.id} className="resource">
            <div>
              <a href={video.url ?? "#"} target="_blank" rel="noreferrer">
                {video.title}
              </a>
              {video.body ? <p className="muted">{video.body}</p> : null}
            </div>
          </article>
        ))}
        {faqs.map((faq) => (
          <details key={faq.id} className="faq">
            <summary>{faq.title}</summary>
            <p>{faq.body}</p>
          </details>
        ))}
      </section>
    </main>
  );
}
