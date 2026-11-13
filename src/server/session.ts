import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session-cookie";
import type { Actor } from "@/server/actor";
import { readSessionToken, revokeSession, type SessionRead } from "@/server/auth";

export async function readSession(): Promise<SessionRead> {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function getActor(): Promise<Actor | null> {
  const session = await readSession();
  return session.status === "ok" ? session.actor : null;
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token);
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}

function redirectForSession(session: SessionRead): never {
  if (session.status === "disabled") redirect("/login?error=disabled");
  if (session.status === "portal_disabled") redirect("/login?error=portal");
  redirect("/login");
}

export async function requireAdminActor(): Promise<Actor> {
  const session = await readSession();
  if (session.status !== "ok") redirectForSession(session);
  if (session.actor.role !== "ADMIN") redirect("/portal");
  return session.actor;
}

export async function requireClientActor(): Promise<Actor> {
  const session = await readSession();
  if (session.status !== "ok") redirectForSession(session);
  if (session.actor.role !== "CLIENT") redirect("/admin");
  return session.actor;
}
