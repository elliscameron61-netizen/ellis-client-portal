import { listOrganisations } from "@/server/portal-data";
import { requireAdminActor } from "@/server/session";

export const metadata = { title: "Clients" };

export default async function OrganisationsPage() {
  const actor = await requireAdminActor();
  const organisations = await listOrganisations(actor);
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <p className="lede">Each client organisation has its own sites, jobs, certificates and invoices.</p>
        </div>
        <a className="btn btn-primary" href="/admin/organisations/new">
          New client
        </a>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Portal</th>
              <th>Sites</th>
              <th>Users</th>
              <th>Jobs</th>
            </tr>
          </thead>
          <tbody>
            {organisations.map((organisation) => (
              <tr key={organisation.id}>
                <td>
                  <a href={`/admin/organisations/${organisation.id}`}>{organisation.name}</a>
                </td>
                <td>{organisation.portalEnabled ? "On" : "Off"}</td>
                <td>{organisation._count.sites}</td>
                <td>{organisation._count.users}</td>
                <td>{organisation._count.jobs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
