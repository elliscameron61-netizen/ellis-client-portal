import { StatusPill } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { listInvoices, listOrganisations } from "@/server/portal-data";
import { requireAdminActor } from "@/server/session";

export const metadata = { title: "Invoices" };

export default async function AdminInvoicesPage() {
  const actor = await requireAdminActor();
  const [invoices, organisations] = await Promise.all([listInvoices(actor), listOrganisations(actor)]);
  const names = new Map(organisations.map((organisation) => [organisation.id, organisation.name]));
  return (
    <main className="page" id="main">
      <h1>Invoices</h1>
      <p className="lede">Copied from QuickBooks. Payments are still recorded there, not in this portal.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Issued</th>
              <th>Status</th>
              <th>Total</th>
              <th>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>
                  {invoice.externalRef}
                  <div className="muted">{invoice.description}</div>
                </td>
                <td>{names.get(invoice.organisationId) ?? invoice.customerName}</td>
                <td>{formatDate(invoice.issuedAt)}</td>
                <td>
                  <StatusPill status={invoice.status} />
                </td>
                <td>{formatMoney(invoice.totalCents, invoice.currency)}</td>
                <td>{formatMoney(invoice.balanceCents, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
