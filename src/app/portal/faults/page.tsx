import { formatDateTime, faultStatusLabel, priorityLabel } from "@/lib/format";
import { StatusPill } from "@/components/ui";
import { listFaults } from "@/server/portal-data";
import { requireClientActor } from "@/server/session";

export const metadata = { title: "Fault requests" };

export default async function ClientFaultsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const actor = await requireClientActor();
  const params = await searchParams;
  const faults = await listFaults(actor);
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1>Fault requests</h1>
          <p className="lede">Requests you have sent to Ellis Electrical.</p>
        </div>
        <a className="btn btn-primary" href="/portal/faults/new">
          Log a fault
        </a>
      </div>
      {params.sent ? (
        <p className="banner banner-success">
          Your request has been sent to Ellis Electrical. They will be in touch.
        </p>
      ) : null}
      {faults.length === 0 ? <p className="muted">You have not logged a fault yet.</p> : null}
      <div className="job-list">
        {faults.map((fault) => (
          <article className="job-row" key={fault.id}>
            <header>
              <strong>{fault.site.name}</strong>
              <StatusPill status={faultStatusLabel(fault.status)} />
            </header>
            <p>{fault.description}</p>
            <p className="muted">
              {priorityLabel(fault.priority)} · {formatDateTime(fault.createdAt)}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
