import { formatDate } from "@/lib/format";
import { Empty } from "@/components/ui";
import { listSiteSummaries } from "@/server/portal-data";
import { requireClientActor } from "@/server/session";

export const metadata = { title: "Sites" };

export default async function PortalHomePage() {
  const actor = await requireClientActor();
  const sites = await listSiteSummaries(actor);
  return (
    <main className="page" id="main">
      <h1>Sites</h1>
      <p className="lede">Open jobs, the last visit on file, and the next certificate date when we have one.</p>
      {sites.length === 0 ? (
        <Empty
          title="No sites yet"
          body="When Ellis Electrical adds a site for your organisation, it will show up here."
        />
      ) : (
        <div className="site-grid">
          {sites.map((site) => (
            <a className="site-card" key={site.id} href={`/portal/sites/${site.id}`}>
              <h2>{site.name}</h2>
              <p className="muted">{site.address}</p>
              <div className="mini-stats">
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
                  <strong>
                    {site.nextCoc ? formatDate(site.nextCoc) : "Not on file"}
                    {site.nextCocOverdue ? " · overdue" : ""}
                  </strong>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
