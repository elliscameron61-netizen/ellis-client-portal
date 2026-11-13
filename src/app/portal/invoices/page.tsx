import { Empty, StatusPill } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { listInvoices } from "@/server/portal-data";
import { requireClientActor } from "@/server/session";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const actor = await requireClientActor();
  const invoices = await listInvoices(actor);
  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(invoice.balanceCents, 0), 0);
  return (
    <main className="page" id="main">
      <h1>Invoices</h1>
      <p className="lede">
        These figures are copied from QuickBooks for your records. Ellis Electrical issues invoices and records
        payment there.
      </p>
      <section className="stats">
        <article className="stat-card">
          <strong>{formatMoney(outstanding)}</strong>
          <span>Outstanding balance</span>
        </article>
      </section>
      {invoices.length === 0 ? (
        <Empty title="No invoices yet" body="Imported QuickBooks invoices for your organisation will be listed here." />
      ) : (
        <div className="job-list">
          {invoices.map((invoice) => (
            <article className="job-row" key={invoice.id}>
              <header>
                <strong>{invoice.externalRef}</strong>
                <StatusPill status={invoice.status} />
              </header>
              <p>{invoice.description || "Invoice"}</p>
              <p className="muted">
                Issued {formatDate(invoice.issuedAt)} · Due {formatDate(invoice.dueAt)}
                {invoice.jobNumber ? ` · Job ${invoice.jobNumber}` : ""}
              </p>
              <p>
                Total {formatMoney(invoice.totalCents, invoice.currency)} · Outstanding{" "}
                {formatMoney(invoice.balanceCents, invoice.currency)}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
