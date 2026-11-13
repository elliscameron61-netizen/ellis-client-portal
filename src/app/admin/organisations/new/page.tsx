import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { createClientAction } from "@/server/actions/admin";

export const metadata = { title: "New client" };

export default function NewOrganisationPage() {
  return (
    <main className="page" id="main">
      <h1>New client</h1>
      <p className="lede">Create the organisation, optionally its first site, and invite someone to the portal.</p>
      <div className="panel">
        <ActionForm action={createClientAction} submitLabel="Create client">
          <Field label="Organisation name">
            <input name="name" required placeholder="Example Property Management" />
          </Field>
          <Field label="Contact name">
            <input name="contactName" />
          </Field>
          <Field label="Contact email">
            <input name="contactEmail" type="email" />
          </Field>
          <Field label="Contact phone">
            <input name="contactPhone" />
          </Field>
          <Field label="Staff notes" hint="Visible to Ellis staff only.">
            <textarea name="notes" />
          </Field>
          <Field label="Portal access">
            <select name="portalEnabled" defaultValue="yes">
              <option value="yes">On — invited users can sign in</option>
              <option value="no">Off — keep the record, no sign-in</option>
            </select>
          </Field>
          <h2>First site</h2>
          <Field label="Site name" hint="Leave blank to add sites later.">
            <input name="siteName" />
          </Field>
          <Field label="Site address">
            <input name="siteAddress" />
          </Field>
          <h2>Invite a user</h2>
          <Field label="Name" hint="Leave the email blank if you are not inviting anyone yet.">
            <input name="inviteName" />
          </Field>
          <Field label="Email">
            <input name="inviteEmail" type="email" />
          </Field>
        </ActionForm>
      </div>
    </main>
  );
}
