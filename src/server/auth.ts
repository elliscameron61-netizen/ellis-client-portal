import type { Organisation, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { hashToken, newToken } from "@/lib/tokens";
import type { Actor } from "@/server/actor";
import { ValidationError } from "@/server/errors";
import { notify } from "@/server/notifications";

const SESSION_DAYS = 14;
const MAGIC_MINUTES = 30;
const RESET_HOURS = 2;
const INVITE_DAYS = 7;

type UserWithOrg = User & { organisation: Organisation | null };

export type SessionRead =
  | { status: "ok"; actor: Actor }
  | { status: "anonymous" }
  | { status: "disabled" }
  | { status: "portal_disabled" };

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toActor(user: UserWithOrg): Actor {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organisationId: user.organisationId,
    organisationName: user.organisation?.name ?? null,
  };
}

function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export async function createSession(userId: string): Promise<string> {
  const token = newToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: sessionExpiry(),
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
  return token;
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function readSessionToken(token: string | undefined | null): Promise<SessionRead> {
  if (!token) return { status: "anonymous" };
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { organisation: true } } },
  });
  if (!session) return { status: "anonymous" };
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return { status: "anonymous" };
  }
  if (session.user.disabled) return { status: "disabled" };
  if (session.user.role === "CLIENT") {
    if (!session.user.organisation || !session.user.organisation.portalEnabled) {
      return { status: "portal_disabled" };
    }
  }
  return { status: "ok", actor: toActor(session.user) };
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ ok: true; token: string; actor: Actor } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { email: normaliseEmail(email) },
    include: { organisation: true },
  });
  if (!user?.passwordHash) {
    return { ok: false, error: "Email or password is incorrect." };
  }
  const matches = await verifyPassword(password, user.passwordHash);
  if (!matches) return { ok: false, error: "Email or password is incorrect." };
  if (user.disabled) {
    return { ok: false, error: "This account is disabled. Contact Ellis Electrical." };
  }
  if (user.role === "CLIENT" && (!user.organisation || !user.organisation.portalEnabled)) {
    return {
      ok: false,
      error: "Portal access is not enabled for your organisation. Contact Ellis Electrical at info@elliselectrical.co.za.",
    };
  }
  const token = await createSession(user.id);
  return { ok: true, token, actor: toActor(user) };
}

async function issueToken(userId: string, purpose: string, expiresAt: Date): Promise<string> {
  const token = newToken();
  await prisma.authToken.create({
    data: { userId, purpose, tokenHash: hashToken(token), expiresAt },
  });
  return token;
}

export async function requestMagicLink(email: string): Promise<{ sent: boolean; url?: string }> {
  const user = await prisma.user.findUnique({
    where: { email: normaliseEmail(email) },
    include: { organisation: true },
  });
  if (!user || user.disabled) return { sent: false };
  if (user.role === "CLIENT" && (!user.organisation || !user.organisation.portalEnabled)) {
    return { sent: false };
  }
  const token = await issueToken(user.id, "magic_link", new Date(Date.now() + MAGIC_MINUTES * 60 * 1000));
  const url = `${appUrl()}/auth/verify?token=${encodeURIComponent(token)}`;
  await notify({
    to: user.email,
    subject: "Your Ellis Electrical sign-in link",
    body: [
      `Hello ${user.name},`,
      "",
      "Use this link to sign in to the Ellis Electrical client portal:",
      url,
      "",
      "The link expires in 30 minutes and works once.",
      "",
      "Ellis Electrical",
      "info@elliselectrical.co.za",
    ].join("\n"),
  });
  return { sent: true, url };
}

export async function consumeMagicLink(token: string | null | undefined): Promise<
  { ok: true; sessionToken: string; actor: Actor } | { ok: false }
> {
  if (!token) return { ok: false };
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.purpose !== "magic_link") return { ok: false };
  const consumed = await prisma.authToken.updateMany({
    where: { id: record.id, usedAt: null, purpose: "magic_link", expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) return { ok: false };
  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    include: { organisation: true },
  });
  if (!user || user.disabled) return { ok: false };
  if (user.role === "CLIENT" && (!user.organisation || !user.organisation.portalEnabled)) return { ok: false };
  const sessionToken = await createSession(user.id);
  return { ok: true, sessionToken, actor: toActor(user) };
}

export async function requestPasswordReset(email: string): Promise<{ sent: boolean; url?: string }> {
  const user = await prisma.user.findUnique({ where: { email: normaliseEmail(email) } });
  if (!user || user.disabled) return { sent: false };
  const token = await issueToken(user.id, "password_reset", new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000));
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await notify({
    to: user.email,
    subject: "Reset your Ellis Electrical portal password",
    body: [
      `Hello ${user.name},`,
      "",
      "Set a new password for the Ellis Electrical client portal:",
      url,
      "",
      "The link expires in 2 hours. If you did not ask for this, you can ignore the email.",
      "",
      "Ellis Electrical",
      "info@elliselectrical.co.za",
    ].join("\n"),
  });
  return { sent: true, url };
}

export async function resetPassword(token: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem };
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || (record.purpose !== "password_reset" && record.purpose !== "invite")) {
    return { ok: false, error: "This link is invalid or has already been used." };
  }
  const consumed = await prisma.authToken.updateMany({
    where: {
      id: record.id,
      usedAt: null,
      purpose: { in: ["password_reset", "invite"] },
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) {
    return { ok: false, error: "This link is invalid or has already been used." };
  }
  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash: await hashPassword(password) },
  });
  await prisma.session.deleteMany({ where: { userId: record.userId } });
  return { ok: true };
}

export async function createInvite(input: {
  email: string;
  name: string;
  role: "ADMIN" | "CLIENT";
  organisationId?: string | null;
}): Promise<{ userId: string; url: string }> {
  const email = normaliseEmail(input.email);
  const name = input.name.trim();
  if (name.length < 2) throw new ValidationError("Enter the person's name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("Enter a valid email address.");

  if (input.role === "CLIENT") {
    if (!input.organisationId) throw new ValidationError("Choose a client organisation.");
    const organisation = await prisma.organisation.findUnique({ where: { id: input.organisationId } });
    if (!organisation) throw new ValidationError("That client organisation was not found.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.role === "ADMIN" && input.role === "CLIENT") {
    throw new ValidationError("That email belongs to an Ellis staff account.");
  }
  if (existing?.role === "CLIENT" && input.role === "ADMIN") {
    throw new ValidationError("That email belongs to a client user.");
  }
  if (
    existing?.role === "CLIENT" &&
    existing.organisationId &&
    input.organisationId &&
    existing.organisationId !== input.organisationId
  ) {
    throw new ValidationError("That email is already registered to another organisation.");
  }

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          disabled: false,
          role: input.role,
          organisationId: input.role === "ADMIN" ? null : input.organisationId,
        },
      })
    : await prisma.user.create({
        data: {
          email,
          name,
          role: input.role,
          organisationId: input.role === "ADMIN" ? null : input.organisationId,
        },
      });

  const token = await issueToken(user.id, "invite", new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000));
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const organisation = input.organisationId
    ? await prisma.organisation.findUnique({ where: { id: input.organisationId } })
    : null;
  await notify({
    to: user.email,
    subject: "You are invited to the Ellis Electrical portal",
    body: [
      `Hello ${user.name},`,
      "",
      organisation
        ? `You have been invited to the Ellis Electrical client portal for ${organisation.name}.`
        : "You have been invited to the Ellis Electrical staff portal.",
      "",
      "Set your password:",
      url,
      "",
      "This link expires in 7 days.",
      "",
      "Ellis Electrical",
      "info@elliselectrical.co.za",
    ].join("\n"),
  });
  return { userId: user.id, url };
}

export async function setUserDisabled(userId: string, disabled: boolean, actorId: string): Promise<void> {
  if (userId === actorId && disabled) {
    throw new ValidationError("You cannot disable your own account.");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ValidationError("That user was not found.");
  if (user.role === "ADMIN" && disabled) {
    const others = await prisma.user.count({
      where: { role: "ADMIN", disabled: false, NOT: { id: user.id } },
    });
    if (others === 0) throw new ValidationError("At least one Ellis admin must stay active.");
  }
  await prisma.user.update({ where: { id: user.id }, data: { disabled } });
  if (disabled) await prisma.session.deleteMany({ where: { userId: user.id } });
}
