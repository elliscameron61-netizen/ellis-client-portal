import { notFound } from "next/navigation";
import { StatusPill } from "@/components/ui";
import { formatDate, jobNumberLabel } from "@/lib/format";
import { getSite } from "@/server/portal-data";
import { requireClientActor } from "@/server/session";

export const metadata = { title: "Site" };

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireClientActor();
  const { id } = await params;
  const site = await getSite(actor, id);
  if (!site) notFound();

  return (
    <main className="page" id="main">
      <p>
        <a href="/portal">Sites</a>
      </p>
      <h1>{site.name}</h1>
      <p className="lede">{site.address}</p>
      <div className="mini-stats panel">
        <div>
          <span>Open jobs</span>
          <strong>{site.openJobs}</strong>
        </div>
        <div>
          <span>Last visit</span>
          <strong>{formatDate(site.lastVisit)}</strong>
        </div>
        <div>
          <span>Next COC due</span>
          <strong>{site.nextCoc ? `${formatDate(site.nextCoc)}${site.nextCocOverdue ? " · overdue" : ""}` : "Not on file"}</strong>
        </div>
      </div>
      <h2>Job history</h2>
      {site.jobs.length === 0 ? <p className="muted">No jobs on file for this site.</p> : null}
      <div className="job-list">
        {site.jobs.map((job) => (
          <a className="job-row" key={job.id} href={`/portal/jobs/${job.id}`}>
            <header>
              <strong>{jobNumberLabel(job.externalRef)}</strong>
              <StatusPill status={job.status} />
            </header>
            <p>{job.title}</p>
            <p className="muted">
              {formatDate(job.completedAt ?? job.scheduledAt)}
              {job.team ? ` · ${job.team}` : ""}
            </p>
          </a>
        ))}
      </div>
    </main>
  );
}
