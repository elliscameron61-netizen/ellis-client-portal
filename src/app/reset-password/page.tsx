import { Logo } from "@/components/logo";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { resetPasswordAction } from "@/server/actions/auth";

export const metadata = { title: "Choose a password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="page" id="main">
      <Logo />
      <h1>Choose a password</h1>
      <p className="lede">Use at least 10 characters, with a letter and a number.</p>
      {params.token ? (
        <div className="panel">
          <ActionForm action={resetPasswordAction} submitLabel="Save password">
            <input type="hidden" name="token" value={params.token} />
            <Field label="New password">
              <input name="password" type="password" autoComplete="new-password" required minLength={10} />
            </Field>
          </ActionForm>
        </div>
      ) : (
        <p className="banner banner-error">This page needs the link from your email.</p>
      )}
    </main>
  );
}
