import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { inviteUserAction, setUserDisabledAction } from "@/server/actions/admin";
import { listOrganisations, listUsers } from "@/server/portal-data";
import { requireAdminActor } from "@/server/session";

export const metadata = { title: "People" };

export default async function UsersPage() {
  const actor = await requireAdminActor();
  const [users, organisations] = await Promise.all([listUsers(actor), listOrganisations(actor)]);
  return (
    <main className="page" id="main">
      <h1>People</h1>
      <p className="lede">Invite client users, add Ellis staff, and disable accounts that should no longer sign in.</p>
      <div className="grid-2">
        <section className="panel">
          <h2>Invite a client user</h2>
          <ActionForm action={inviteUserAction} submitLabel="Send invite">
            <input type="hidden" name="role" value="CLIENT" />
            <Field label="Organisation">
              <select name="organisationId" required defaultValue="">
                <option value="" disabled>
                  Choose a client
                </option>
                {organisations.map((organisation) => (
                  <option key={organisation.id} value={organisation.id}>
                    {organisation.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Name">
              <input name="name" required />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required />
            </Field>
          </ActionForm>
        </section>
        <section className="panel">
          <h2>Add Ellis staff</h2>
          <ActionForm action={inviteUserAction} submitLabel="Invite staff member" secondary>
            <input type="hidden" name="role" value="ADMIN" />
            <Field label="Name">
              <input name="name" required />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required />
            </Field>
          </ActionForm>
        </section>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Organisation</th>
              <th>Last sign-in</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.name}
                  {user.disabled ? " (disabled)" : ""}
                </td>
                <td>{user.email}</td>
                <td>{user.role === "ADMIN" ? "Ellis admin" : "Client"}</td>
                <td>{user.organisation?.name ?? "—"}</td>
                <td>{formatDateTime(user.lastLoginAt)}</td>
                <td>
                  <form action={setUserDisabledAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="disabled" value={user.disabled ? "no" : "yes"} />
                    <button className="btn btn-small btn-ghost" type="submit">
                      {user.disabled ? "Enable" : "Disable"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
