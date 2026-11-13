import type { Role } from "@prisma/client";
import { AccessError } from "@/server/errors";

/**
 * The signed-in person. organisationId is loaded from the database
 * with the session. Client queries must use this value and ignore any
 * organisation id supplied by the browser.
 */
export type Actor = {
  id: string;
  email: string;
  name: string;
  role: Role;
  organisationId: string | null;
  organisationName: string | null;
};

export function assertAdmin(actor: Actor): void {
  if (actor.role !== "ADMIN") {
    throw new AccessError("Ellis staff access is required.");
  }
}

export function clientOrganisationId(actor: Actor): string {
  if (actor.role !== "CLIENT" || !actor.organisationId) {
    throw new AccessError("This account is not linked to a client organisation.");
  }
  return actor.organisationId;
}

/**
 * Scope a query to one organisation.
 * Clients are pinned to their own organisation even if a caller passes another id.
 */
export function organisationWhere(
  actor: Actor,
  requestedOrganisationId?: string | null,
): { organisationId: string } | Record<string, never> {
  if (actor.role === "CLIENT") {
    return { organisationId: clientOrganisationId(actor) };
  }
  assertAdmin(actor);
  if (requestedOrganisationId) return { organisationId: requestedOrganisationId };
  return {};
}
