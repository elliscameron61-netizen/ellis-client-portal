import { Logo } from "@/components/logo";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/env";
import { forgotPasswordAction } from "@/server/actions/auth";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <main className="page" id="main">
      <Logo />
      <h1>Reset your password</h1>
      <p className="lede">If the account exists, we will email a link to choose a new password.</p>
      <div className="panel">
        <ActionForm action={forgotPasswordAction} submitLabel="Send reset link">
          <Field label="Email">
            <input name="email" type="email" autoComplete="username" required />
          </Field>
        </ActionForm>
      </div>
      <p>
        <a href="/login">Back to sign in</a>
      </p>
      <p className="muted">{CONTACT_EMAIL}</p>
    </main>
  );
}
