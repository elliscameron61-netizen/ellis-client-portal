import { Logo } from "@/components/logo";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/env";
import { magicLinkAction } from "@/server/actions/auth";

export const metadata = { title: "Sign-in link" };

export default function MagicLinkPage() {
  return (
    <main className="page" id="main">
      <Logo />
      <h1>Email a sign-in link</h1>
      <p className="lede">We will send a one-time link if this address has portal access. The link expires in 30 minutes.</p>
      <div className="panel">
        <ActionForm action={magicLinkAction} submitLabel="Send link">
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
