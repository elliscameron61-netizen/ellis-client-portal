import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { INVOICE_COLUMN_GUIDE, JOB_COLUMN_GUIDE } from "@/lib/csv";
import { importInvoicesAction, importJobsAction } from "@/server/actions/admin";

export const metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <main className="page" id="main">
      <h1>Import</h1>
      <p className="lede">
        Tradify stays the job record and QuickBooks stays the invoice record. These imports copy rows into the
        portal. Import again to update the same job number or invoice number. Notes, photos and videos are left
        as they are.
      </p>
      <div className="grid-2">
        <section className="panel">
          <h2>Tradify jobs</h2>
          <ActionForm action={importJobsAction} submitLabel="Import jobs" multipart>
            <Field label="Jobs CSV" hint="Sample file: samples/tradify-jobs.sample.csv">
              <input name="file" type="file" accept=".csv,text/csv" required />
            </Field>
          </ActionForm>
        </section>
        <section className="panel">
          <h2>QuickBooks invoices</h2>
          <ActionForm action={importInvoicesAction} submitLabel="Import invoices" multipart>
            <Field label="Invoices CSV" hint="Sample file: samples/quickbooks-invoices.sample.csv">
              <input name="file" type="file" accept=".csv,text/csv" required />
            </Field>
          </ActionForm>
        </section>
      </div>
      <section className="panel">
        <h2>Job columns</h2>
        <p className="muted">
          A blank job number is allowed. The portal then matches a later import on customer, site, title and
          scheduled date. Customer must already exist as a client.
        </p>
        <div className="table-wrap">
          <table className="guide">
            <thead>
              <tr>
                <th>Column</th>
                <th>Required</th>
                <th>Maps to</th>
              </tr>
            </thead>
            <tbody>
              {JOB_COLUMN_GUIDE.map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Invoice columns</h2>
        <p className="muted">Amounts are South African rand. If Status is empty, it is derived from the balance and due date.</p>
        <div className="table-wrap">
          <table className="guide">
            <thead>
              <tr>
                <th>Column</th>
                <th>Required</th>
                <th>Maps to</th>
              </tr>
            </thead>
            <tbody>
              {INVOICE_COLUMN_GUIDE.map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
