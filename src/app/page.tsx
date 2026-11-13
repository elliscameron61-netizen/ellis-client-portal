import { redirect } from "next/navigation";
import { readSession } from "@/server/session";

export default async function HomePage() {
  const session = await readSession();
  if (session.status === "disabled") redirect("/login?error=disabled");
  if (session.status === "portal_disabled") redirect("/login?error=portal");
  if (session.status !== "ok") redirect("/login");
  redirect(session.actor.role === "ADMIN" ? "/admin" : "/portal");
}
