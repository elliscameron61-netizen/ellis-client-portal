import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Field, StatusPill } from "@/components/ui";
import { formatDate, jobNumberLabel } from "@/lib/format";
import {
  createJobAction,
  createSiteAction,
  inviteUserAction,
  setUserDisabledAction,
  updateOrganisationAction,
  updatePortalAccessAction,
} from "@/server/actions/admin";
import { getOrganisation } from "@/server/portal-data";
import { requireAdminActor } from "@/server/session";

export const metadata = { title: "Client" };

export default async function OrganisationPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminActor();
  const { id } = await params;
  const organisation = await getOrganisation(actor, id);
  if (!organisation) notFound();

  return (
    <main className="page" id="main">
      <h1>{organisation.name}</h1>
      <p className="lede">{organisation.portalEnabled ? "Portal access is on." : "Portal access is off."}</p>
      <div className="grid-2">
        <div>
          <section className="panel">
            <h2>Portal access</h2>
            <ActionForm action={updatePortalAccessAction} submitLabel="Save access">
              <input type="hidden" name="organisationId" value={organisation.id} />
              <Field label="Who can sign in">
                <select name="portalEnabled" defaultValue={organisation.portalEnabled ? "yes" : "no"}>
                  <option value="yes">On</option>
                  <option value="no">Off</option>
                </select>
              </Field>
            </ActionForm>
          </section>
          <section className="panel">
            <h2>Contact</h2>
            <ActionForm action={updateOrganisationAction} submitLabel="Save details" secondary>
              <input type="hidden" name="organisationId" value={organisation.id} />
              <Field label="Contact name">
                <input name="contactName" defaultValue={organisation.contactName ?? ""} />
              </Field>
              <Field label="Contact email">
                <input name="contactEmail" type="email" defaultValue={organisation.contactEmail ?? ""} />
              </Field>
              <Field label="Contact phone">
                <input name="contactPhone" defaultValue={organisation.contactPhone ?? ""} />
              </Field>
              <Field label="Staff notes">
                <textarea name="notes" defaultValue={organisation.notes ?? ""} />
              </Field>
            </ActionForm>
          </section>
          <section className="panel">
            <h2>Sites</h2>
            <ul>
              {organisation.sites.map((site) => (
                <li key={site.id}>
                  <strong>{site.name}</strong>
                  <div className="muted">{site.address}</div>
                </li>
              ))}
            </ul>
            <ActionForm action={createSiteAction} submitLabel="Add site">
              <input type="hidden" name="organisationId" value={organisation.id} />
              <Field label="Site name">
                <input name="name" required />
              </Field>
              <Field label="Address">
                <input name="address" required />
              </Field>
              <Field label="Site contact">
                <input name="contactName" />
              </Field>
            </ActionForm>
          </section>
        </div>
        <div>
          <section className="panel">
            <h2>People</h2>
            {organisation.users.length === 0 ? <p className="muted">No users yet.</p> : null}
            {organisation.users.map((user) => (
              <div className="file-row" key={user.id}>
                <div>
                  <strong>{user.name}</strong>
                  <div className="muted">
                    {user.email}
                    {user.disabled ? " · disabled" : ""}
                  </div>
                </div>
                <form action={setUserDisabledAction} className="inline-form">
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="disabled" value={user.disabled ? "no" : "yes"} />
                  <button className="btn btn-small btn-ghost" type="submit">
                    {user.disabled ? "Enable" : "Disable"}
                  </button>
                </form>
              </div>
            ))}
            <ActionForm action={inviteUserAction} submitLabel="Send invite">
              <input type="hidden" name="role" value="CLIENT" />
              <input type="hidden" name="organisationId" value={organisation.id} />
              <Field label="Invite name">
                <input name="name" required />
              </Field>
              <Field label="Invite email">
                <input name="email" type="email" required />
              </Field>
            </ActionForm>
          </section>
          <section className="panel">
            <h2>Add a job</h2>
            <ActionForm action={createJobAction} submitLabel="Create job">
              <input type="hidden" name="organisationId" value={organisation.id} />
              <Field label="Site">
                <select name="siteId" defaultValue="">
                  <option value="">No site yet</option>
                  {organisation.sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <input name="title" required />
              </Field>
              <Field label="Status">
                <input name="status" defaultValue="Scheduled" />
              </Field>
              <Field label="Team">
                <input name="team" />
              </Field>
            </ActionForm>
          </section>
        </div>
      </div>
      <section className="panel">
        <h2>Recent jobs</h2>
        {organisation.jobs.length === 0 ? <p className="muted">No jobs imported yet.</p> : null}
        <div className="job-list">
          {organisation.jobs.map((job) => (
            <a className="job-row" key={job.id} href={`/admin/jobs/${job.id}`}>
              <header>
                <strong>{jobNumberLabel(job.externalRef)}</strong>
                <StatusPill status={job.status} />
              </header>
              <p>
                {job.title}
                {job.site ? ` · ${job.site.name}` : ""} · {formatDate(job.scheduledAt ?? job.completedAt)}
              </p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
