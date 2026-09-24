import {
  getActiveApplication,
  linkedCatAllowsMultiple,
  setApplicationLinkedCats,
  setApplicationMatchConfidence,
} from "./ActiveApplicationsService";
import { getCats, updateCatStatus } from "./CatsService";
import { CATS_STATUS_OPTIONS } from "../constants/statuses/catsStatuses";
import { buildBondedGroups } from "../utils/bondedGroups";

const { STATUS } = CATS_STATUS_OPTIONS;

// Thrown when the data changed between loading the page and confirming the
// match (e.g. another volunteer matched the same cat) - nothing is written.
export class MatchConflictError extends Error {}

// Thrown when the Monday board setup can't store the match (e.g. Linked
// Cat doesn't allow multiple items, so a bonded group can't be linked) -
// nothing is written; needs a board change rather than a retry.
export class MatchConfigError extends Error {}

export function isCatMatchable(cat) {
  return cat.status === STATUS.ADOPTION_READY && !cat.linkedAdopterId;
}

// Bonded cats are only ever matched together, so a group is offered only
// when every cat in it is matchable - one reserved/unready cat blocks the
// whole group rather than silently splitting it.
export function getMatchableGroups(cats) {
  return buildBondedGroups(cats).filter((group) => group.cats.every(isCatMatchable));
}

function sameIds(a, b) {
  const left = [...a].map(String).sort();
  const right = [...b].map(String).sort();

  return left.length === right.length && left.every((id, index) => id === right[index]);
}

// Monday has no multi-item transactions, so the remaining writes run with
// allSettled and every failure is reported back instead of stopping at the
// first one - the caller can then show exactly what didn't save.
async function runSteps(steps) {
  const results = await Promise.allSettled(steps.map((step) => step.run()));

  return results
    .map((result, index) => {
      if (result.status !== "rejected") {
        return null;
      }

      // The UI only shows the step; keep Monday's reason for debugging.
      console.error(`Matching step failed (${steps[index].description}):`, result.reason);
      return steps[index].description;
    })
    .filter(Boolean);
}

// Links an application to a whole bonded group: the application's Linked
// Cat, then each cat's "Reserved" status and the (required) Match
// Confidence. The cats' Linked Adopter column is the two-way mirror of
// Linked Cat, so Monday fills it in - writing it as well fails.
//
// Returns { failed: string[] } describing any writes after the first that
// did not save. Throws MatchConflictError (nothing written) if the group or
// application is no longer matchable, or MatchConfigError (nothing written)
// if the board can't hold a bonded group yet.
export async function matchApplicationToGroup({ applicationId, catIds, matchConfidence }) {
  // Enforced here as well as in the dialog so no caller can create a match
  // without one.
  if (!matchConfidence) {
    throw new Error("Match Confidence is required.");
  }

  const [application, cats] = await Promise.all([getActiveApplication(applicationId), getCats()]);

  if (!application) {
    throw new MatchConflictError("This application no longer exists.");
  }

  if (application.linkedCatIds.length > 0) {
    throw new MatchConflictError(
      `${application.name} is already matched with ${application.linkedCatName}.`,
    );
  }

  const group = buildBondedGroups(cats).find((candidate) =>
    candidate.cats.some((cat) => String(cat.id) === String(catIds[0])),
  );

  if (!group || !sameIds(group.cats.map((cat) => cat.id), catIds)) {
    throw new MatchConflictError("This bonded group has changed since the page loaded.");
  }

  const unavailable = group.cats.filter((cat) => !isCatMatchable(cat));

  if (unavailable.length > 0) {
    throw new MatchConflictError(
      `${unavailable.map((cat) => cat.name).join(", ")} can no longer be matched.`,
    );
  }

  if (catIds.length > 1 && !(await linkedCatAllowsMultiple())) {
    throw new MatchConfigError(
      'Bonded groups can\'t be matched yet: the application\'s "Linked Cat" column on Monday only allows one item. Turn on multiple items for that column, then try again.',
    );
  }

  // Written first and on its own: if this fails nothing else is touched and
  // the error propagates as a plain failure.
  await setApplicationLinkedCats(applicationId, catIds);

  const steps = group.cats.map((cat) => ({
    description: `set ${cat.name} to "${STATUS.RESERVED}"`,
    run: () => updateCatStatus(cat.id, STATUS.RESERVED),
  }));

  steps.push({
    description: "save Match Confidence",
    run: () => setApplicationMatchConfidence(applicationId, matchConfidence),
  });

  return { failed: await runSteps(steps) };
}

// Reverses a match: clears the application's Linked Cat (Monday clears the
// cats' mirrored Linked Adopter with it) and Match Confidence, and puts
// each linked cat back to "Adoption Ready". A cat that is now linked to a
// *different* application (edited on Monday since) keeps its status.
export async function unmatchApplication(application) {
  const cats = await getCats();
  const catsById = new Map(cats.map((cat) => [String(cat.id), cat]));

  await setApplicationLinkedCats(application.id, []);

  const steps = [
    {
      description: "clear Match Confidence",
      run: () => setApplicationMatchConfidence(application.id, null),
    },
  ];

  for (const linked of application.linkedCats) {
    const cat = catsById.get(String(linked.id));
    const linkedElsewhere =
      cat?.linkedAdopterId && String(cat.linkedAdopterId) !== String(application.id);

    if (!cat || linkedElsewhere) {
      continue;
    }

    steps.push({
      description: `set ${cat.name} to "${STATUS.ADOPTION_READY}"`,
      run: () => updateCatStatus(cat.id, STATUS.ADOPTION_READY),
    });
  }

  return { failed: await runSteps(steps) };
}
