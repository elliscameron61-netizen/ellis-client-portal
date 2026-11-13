import { Prisma } from "@prisma/client";
import type { ActionState } from "@/lib/action-state";
import { AccessError, ValidationError } from "@/server/errors";

export function rethrowIfRedirect(error: unknown): void {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }
}

export function actionFailure(error: unknown): ActionState {
  if (error instanceof ValidationError || error instanceof AccessError) {
    return { error: error.message };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { error: "That record already exists." };
  }
  console.error(error);
  return { error: "Something went wrong. Try again." };
}
