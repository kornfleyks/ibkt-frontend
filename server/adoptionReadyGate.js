import { isAdminRole } from "../src/constants/roles.js";
import { READY_REQUIRED_FOR, READY_EXEMPT_FROM, readinessProblems, problemsText } from "../src/constants/catReadiness.js";
import { InputError } from "./database/boardRecords.js";

// The decision for a change that sets a cat's status to Adoption Ready, Reserved or Adopted
// (docs/adoption-ready-gate.md). Pure: the route reads the cat (its real
// values, so a hidden microchip number counts) and acts on the answer.
//
//   changes         the change as sent, e.g. { status: "Adoption Ready" }
//   current         the cat as the cats routes read it, or null when unknown
//   role            the caller's role
//   overrideReason  an Admin's reason for setting it anyway, or undefined
//
// Answers
//   null            the check does not apply (another status, a cat that is
//                   already ready or coming back from a match that fell
//                   through) or the cat is complete: go ahead
//   { refusal }     answer 409 with this body
//   { override }    go ahead, and log { problems, reason }
//
// Throws InputError for a reason that is too long.

export const MAX_OVERRIDE_REASON = 500;

export function evaluateAdoptionReady({ changes, current, role, overrideReason }) {
  if (!READY_REQUIRED_FOR.includes(changes?.status)) return null;

  // An unknown cat is answered as not found by the change itself.
  if (!current || READY_EXEMPT_FROM.includes(current.status)) return null;

  const problems = readinessProblems(current);

  if (problems.length === 0) return null;

  const reason = typeof overrideReason === "string" ? overrideReason.trim() : "";
  const isAdmin = isAdminRole(role);

  if (isAdmin && reason) {
    if (reason.length > MAX_OVERRIDE_REASON) throw new InputError(`The reason can be at most ${MAX_OVERRIDE_REASON} characters.`);

    return { override: { problems, reason, status: changes.status } };
  }

  return {
    refusal: {
      error: `${current.name} can't be set to ${changes.status} yet. Missing: ${problemsText(problems)}.`,
      code: "NOT_READY",
      problems,
      canOverride: isAdmin,
    },
  };
}
