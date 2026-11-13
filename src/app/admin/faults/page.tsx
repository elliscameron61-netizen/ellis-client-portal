import { formatDateTime, faultStatusLabel, priorityLabel } from "@/lib/format";
import { StatusPill } from "@/components/ui";
import { listFaults } from "@/server/portal-data";
import { requireAdminActor } from "@/server/session";

export const metadata = { title: "Fault requests" };

export default async function FaultsPage() {
  const actor = await requireAdminActor();
  const faults = await listFaults(actor);
  return (
    <main className="page" id="main">
      <h1>Fault requests</h1>
      <p className="lede">Requests logged by client users. New requests are also emailed to Ellis admins.</p>
      {faults.length === 0 ? <p className="muted">The queue is empty.</p> : null}
      <div className="job-list">
        {faults.map((fault) => (
          <a className="job-row" key={fault.id} href={`/admin/faults/${fault.id}`}>
            <header>
              <strong>
                {fault.organisation.name} · {fault.site.name}
              </strong>
              <StatusPill status={faultStatusLabel(fault.status)} />
            </header>
            <p>
              {priorityLabel(fault.priority)} · {fault.createdBy.name} · {formatDateTime(fault.createdAt)}
            </p>
            <p>{fault.description}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
