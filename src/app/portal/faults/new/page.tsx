import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/env";
import { logFaultAction } from "@/server/actions/portal";
import { listSiteSummaries } from "@/server/portal-data";
import { requireClientActor } from "@/server/session";

export const metadata = { title: "Log a fault" };

export default async function NewFaultPage() {
  const actor = await requireClientActor();
  const sites = await listSiteSummaries(actor);
  return (
    <main className="page" id="main">
      <h1>Log a fault</h1>
      <p className="lede">
        Tell Ellis Electrical what you have noticed. Include the site, what happened, and photos if you have them.
      </p>
      {sites.length === 0 ? (
        <p className="panel">No sites are on file yet. Email {CONTACT_EMAIL} and Ellis can add the site first.</p>
      ) : (
        <section className="panel">
          <ActionForm action={logFaultAction} submitLabel="Send request" multipart>
            <Field label="Site">
              <select name="siteId" required defaultValue={sites[0]?.id}>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="What happened">
              <textarea name="description" required minLength={10} placeholder="Where it is, and what you can see." />
            </Field>
            <fieldset className="checks">
              <legend>Priority</legend>
              <label>
                <input type="radio" name="priority" value="LOW" />
                <span>
                  <strong>Low</strong>
                  <small>Plan it with other work.</small>
                </span>
              </label>
              <label>
                <input type="radio" name="priority" value="NORMAL" defaultChecked />
                <span>
                  <strong>Normal</strong>
                  <small>Needs attention.</small>
                </span>
              </label>
              <label>
                <input type="radio" name="priority" value="HIGH" />
                <span>
                  <strong>High</strong>
                  <small>There is a safety concern, or the site is without power.</small>
                </span>
              </label>
            </fieldset>
            <Field label="Photos" hint="Optional. Up to 5 images, JPEG, PNG, WEBP or GIF.">
              <input name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple />
            </Field>
          </ActionForm>
        </section>
      )}
    </main>
  );
}
