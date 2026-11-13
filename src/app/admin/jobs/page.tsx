import { StatusPill } from "@/components/ui";
import { formatDate, jobNumberLabel } from "@/lib/format";
import { listJobs } from "@/server/portal-data";
import { requireAdminActor } from "@/server/session";

export const metadata = { title: "Jobs" };

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const actor = await requireAdminActor();
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const jobs = await listJobs(actor);
  const filtered = query
    ? jobs.filter((job) =>
        [job.externalRef, job.title, job.status, job.organisation.name, job.site?.name, job.team]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : jobs;

  return (
    <main className="page" id="main">
      <h1>Jobs</h1>
      <p className="lede">Imported from Tradify, plus any job added here. Notes and files stay in the portal.</p>
      <form className="panel" action="/admin/jobs" method="get">
        <label className="field">
          <span>Search</span>
          <input name="q" defaultValue={params.q ?? ""} placeholder="Job number, client, site" />
        </label>
        <button className="btn btn-ghost" type="submit">
          Search
        </button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Client</th>
              <th>Site</th>
              <th>Status</th>
              <th>Date</th>
              <th>Team</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => (
              <tr key={job.id}>
                <td>
                  <a href={`/admin/jobs/${job.id}`}>{jobNumberLabel(job.externalRef)}</a>
                  <div className="muted">{job.title}</div>
                </td>
                <td>{job.organisation.name}</td>
                <td>{job.site?.name ?? "—"}</td>
                <td>
                  <StatusPill status={job.status} />
                </td>
                <td>{formatDate(job.completedAt ?? job.scheduledAt)}</td>
                <td>{job.team ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
