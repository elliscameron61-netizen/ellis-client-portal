"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action-state";

export function ActionForm({
  action,
  children,
  submitLabel,
  multipart,
  secondary,
}: {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  multipart?: boolean;
  secondary?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="stack" encType={multipart ? "multipart/form-data" : undefined}>
      {state?.error ? (
        <p className="banner banner-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p className="banner banner-success" role="status">
          {state.message}
        </p>
      ) : null}
      {state?.link ? (
        <p className="banner banner-info">
          <a href={state.link}>{state.linkLabel ?? "Open link"}</a>
        </p>
      ) : null}
      {state?.details && state.details.length > 0 ? (
        <ul className="detail-list">
          {state.details.map((detail, index) => (
            <li key={`${index}-${detail}`}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {state?.organisationId ? (
        <p>
          <a className="btn btn-ghost" href={`/admin/organisations/${state.organisationId}`}>
            Open client
          </a>
        </p>
      ) : null}
      {children}
      <button className={secondary ? "btn btn-ghost" : "btn btn-primary"} type="submit" disabled={pending}>
        {pending ? "Working…" : submitLabel}
      </button>
    </form>
  );
}
