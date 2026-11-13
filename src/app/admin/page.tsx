import { formatDateTime, formatMoney, priorityLabel } from "@/lib/format";
import { StatusPill } from "@/components/ui";
import { adminOverview } from "@/server/portal-data";
import { requireAdminActor } from "@/server/session";

export const metadata = { title: "Overview" };

export default async function AdminHomePage() {
  const actor = await requireAdminActor();
  const overview = await adminOverview(actor);
  return (
    <main className="page" id="main">
      <h1>Overview</h1>
      <p className="lede">Ellis Electrical staff view. Tradify and QuickBooks remain the systems of record.</p>
      <section className="stats">
        <article className="stat-card">
          <strong>{overview.portalCount}</strong>
          <span>Clients with portal access</span>
        </article>
        <article className="stat-card">
          <strong>{overview.organisationCount}</strong>
          <span>Client organisations</span>
        </article>
        <article className="stat-card">
          <strong>{overview.openJobs}</strong>
          <span>Open jobs</span>
        </article>
        <article className="stat-card">
          <strong>{formatMoney(overview.outstandingCents)}</strong>
          <span>Outstanding on imported invoices</span>
        </article>
      </section>
      <section className="panel">
        <div className="split">
          <h2>Fault requests</h2>
          <a href="/admin/faults">{overview.newFaults} new</a>
        </div>
        {overview.recentFaults.length === 0 ? (
          <p className="muted">No fault requests yet.</p>
        ) : (
          <div className="job-list">
            {overview.recentFaults.map((fault) => (
              <a className="job-row" key={fault.id} href={`/admin/faults/${fault.id}`}>
                <header>
                  <strong>
                    {fault.organisation.name} · {fault.site.name}
                  </strong>
                  <StatusPill status={fault.status === "NEW" ? "New" : fault.status === "CLOSED" ? "Closed" : "Acknowledged"} />
                </header>
                <p>
                  {priorityLabel(fault.priority)} · {formatDateTime(fault.createdAt)}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
