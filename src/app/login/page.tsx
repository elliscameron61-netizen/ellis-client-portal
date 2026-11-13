import { Logo } from "@/components/logo";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { CONTACT_EMAIL, showDevLinks } from "@/lib/env";
import { loginAction } from "@/server/actions/auth";
import { readSession } from "@/server/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

const errors: Record<string, string> = {
  disabled: "This account is disabled. Contact Ellis Electrical.",
  portal: `Portal access is not enabled for your organisation. Contact ${CONTACT_EMAIL}.`,
  link: "That sign-in link is invalid or has expired.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string; next?: string }>;
}) {
  const session = await readSession();
  if (session.status === "ok") {
    redirect(session.actor.role === "ADMIN" ? "/admin" : "/portal");
  }
  const params = await searchParams;
  const error = params.error ? errors[params.error] : undefined;

  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <div>
          <Logo tone="light" />
          <h1>Client portal</h1>
          <p>
            Jobs, certificates and invoices for the organisations Ellis Electrical works with. Sign in with the
            email address you were invited on.
          </p>
        </div>
        <p className="auth-meta">Johannesburg · {CONTACT_EMAIL}</p>
      </section>
      <section className="auth-panel" id="main">
        <div className="auth-card">
          <h2>Sign in</h2>
          <p className="lede">Email and password, or a one-time sign-in link.</p>
          {error ? <p className="banner banner-error">{error}</p> : null}
          {params.reset ? <p className="banner banner-success">Password saved. Sign in with the new password.</p> : null}
          <ActionForm action={loginAction} submitLabel="Sign in">
            {params.next ? <input type="hidden" name="next" value={params.next} /> : null}
            <Field label="Email">
              <input name="email" type="email" autoComplete="username" required />
            </Field>
            <Field label="Password">
              <input name="password" type="password" autoComplete="current-password" required />
            </Field>
          </ActionForm>
          <div className="links-row">
            <a href="/magic-link">Email me a sign-in link</a>
            <a href="/forgot-password">Forgot password</a>
          </div>
          {showDevLinks() ? (
            <p className="hint">Development logins are listed in the README. They are example accounts only.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
