"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { showDevLinks } from "@/lib/env";
import { loginWithPassword, requestMagicLink, requestPasswordReset, resetPassword } from "@/server/auth";
import { clearSessionCookie, setSessionCookie } from "@/server/session";

const GENERIC_LINK = "If an account matches that email, a link is on its way.";

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await loginWithPassword(email, password);
  if (!result.ok) return { error: result.error };
  await setSessionCookie(result.token);
  redirect(safeDestination(result.actor.role, String(formData.get("next") ?? "")));
}

function safeDestination(role: "ADMIN" | "CLIENT", next: string): string {
  const target = next.trim();
  const local = target.startsWith("/") && !target.startsWith("//") && !target.includes("\\");
  if (local && role === "ADMIN" && target.startsWith("/admin")) return target;
  if (local && role === "CLIENT" && target.startsWith("/portal")) return target;
  return role === "ADMIN" ? "/admin" : "/portal";
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

export async function magicLinkAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const result = await requestMagicLink(email);
  const state: ActionState = { message: GENERIC_LINK };
  if (showDevLinks() && result.url) {
    return { ...state, link: result.url, linkLabel: "Development sign-in link" };
  }
  return state;
}

export async function forgotPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const result = await requestPasswordReset(email);
  const state: ActionState = { message: GENERIC_LINK };
  if (showDevLinks() && result.url) {
    return { ...state, link: result.url, linkLabel: "Development reset link" };
  }
  return state;
}

export async function resetPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await resetPassword(token, password);
  if (!result.ok) return { error: result.error };
  redirect("/login?reset=1");
}
