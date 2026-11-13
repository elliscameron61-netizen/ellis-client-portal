import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session-cookie";
import { consumeMagicLink } from "@/server/auth";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const result = await consumeMagicLink(token);
  if (!result.ok) {
    return NextResponse.redirect(new URL("/login?error=link", request.url));
  }
  const destination = result.actor.role === "ADMIN" ? "/admin" : "/portal";
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set(SESSION_COOKIE, result.sessionToken, sessionCookieOptions());
  return response;
}
