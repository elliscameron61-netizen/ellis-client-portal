export const SESSION_COOKIE = "ellis_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
