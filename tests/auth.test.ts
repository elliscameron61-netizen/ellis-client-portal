import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import {
  consumeMagicLink,
  createInvite,
  loginWithPassword,
  readSessionToken,
  requestMagicLink,
  requestPasswordReset,
  resetPassword,
  revokeSession,
} from "@/server/auth";
import { setUserDisabled } from "@/server/auth";
import { createOrganisation, createUser, resetDatabase } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
});

function tokenFrom(url: string): string {
  return new URL(url).searchParams.get("token") ?? "";
}

describe("authentication", () => {
  it("signs in a client and stores only the hash of the session token", async () => {
    const org = await createOrganisation("Example Org");
    const user = await createUser({
      email: "person@example-org.test",
      name: "Person Example",
      role: "CLIENT",
      organisationId: org.id,
    });

    const bad = await loginWithPassword(user.email, "wrong-password-1");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toBe("Email or password is incorrect.");

    const good = await loginWithPassword(user.email, "test-password-1");
    expect(good.ok).toBe(true);
    if (!good.ok) return;

    const stored = await prisma.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.tokenHash).toBe(hashToken(good.token));
    expect(stored.tokenHash).not.toBe(good.token);

    const session = await readSessionToken(good.token);
    expect(session.status).toBe("ok");
    if (session.status === "ok") expect(session.actor.organisationId).toBe(org.id);

    await revokeSession(good.token);
    expect((await readSessionToken(good.token)).status).toBe("anonymous");
  });

  it("rejects a disabled account and a client whose portal is off", async () => {
    const closed = await createOrganisation("Closed Org", false);
    await createUser({
      email: "closed@example-org.test",
      name: "Closed Example",
      role: "CLIENT",
      organisationId: closed.id,
    });
    const closedLogin = await loginWithPassword("closed@example-org.test", "test-password-1");
    expect(closedLogin.ok).toBe(false);
    if (!closedLogin.ok) expect(closedLogin.error).toMatch(/not enabled/);

    const org = await createOrganisation("Open Org");
    const user = await createUser({
      email: "disabled@example-org.test",
      name: "Disabled Example",
      role: "CLIENT",
      organisationId: org.id,
      disabled: true,
    });
    const disabledLogin = await loginWithPassword(user.email, "test-password-1");
    expect(disabledLogin.ok).toBe(false);
    if (!disabledLogin.ok) expect(disabledLogin.error).toMatch(/disabled/);
  });

  it("drops an existing session when portal access is turned off", async () => {
    const org = await createOrganisation("Live Org");
    const user = await createUser({
      email: "live@example-org.test",
      name: "Live Example",
      role: "CLIENT",
      organisationId: org.id,
    });
    const login = await loginWithPassword(user.email, "test-password-1");
    if (!login.ok) throw new Error("expected login");
    await prisma.organisation.update({ where: { id: org.id }, data: { portalEnabled: false } });
    expect((await readSessionToken(login.token)).status).toBe("portal_disabled");
  });

  it("uses a magic link only once", async () => {
    const org = await createOrganisation("Magic Org");
    await createUser({
      email: "magic@example-org.test",
      name: "Magic Example",
      role: "CLIENT",
      organisationId: org.id,
    });
    const issued = await requestMagicLink("magic@example-org.test");
    expect(issued.sent).toBe(true);
    expect(issued.url).toBeTruthy();
    const token = tokenFrom(issued.url!);
    expect((await consumeMagicLink(token)).ok).toBe(true);
    expect((await consumeMagicLink(token)).ok).toBe(false);
    expect((await requestMagicLink("missing@example-org.test")).sent).toBe(false);
  });

  it("resets a password from a single-use link and accepts an invite", async () => {
    const org = await createOrganisation("Reset Org");
    const user = await createUser({
      email: "reset@example-org.test",
      name: "Reset Example",
      role: "CLIENT",
      organisationId: org.id,
    });
    const reset = await requestPasswordReset(user.email);
    expect(reset.url).toBeTruthy();
    const changed = await resetPassword(tokenFrom(reset.url!), "new-password-2");
    expect(changed.ok).toBe(true);
    expect((await loginWithPassword(user.email, "test-password-1")).ok).toBe(false);
    expect((await loginWithPassword(user.email, "new-password-2")).ok).toBe(true);
    expect((await resetPassword(tokenFrom(reset.url!), "another-password-3")).ok).toBe(false);

    const invite = await createInvite({
      email: "new.person@example-org.test",
      name: "New Example",
      role: "CLIENT",
      organisationId: org.id,
    });
    expect((await resetPassword(tokenFrom(invite.url), "invite-password-4")).ok).toBe(true);
    const invited = await loginWithPassword("new.person@example-org.test", "invite-password-4");
    expect(invited.ok).toBe(true);
  });

  it("will not disable the last active admin", async () => {
    const admin = await createUser({
      email: "only-admin@elliselectrical.example",
      name: "Only Admin",
      role: "ADMIN",
    });
    await expect(setUserDisabled(admin.id, true, "someone-else")).rejects.toThrow(/one Ellis admin/);
  });
});
