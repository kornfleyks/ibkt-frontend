// One-off: copies the old free-text "Case Owner (Legacy)" values onto the
// new Case Owner relation column, by matching each name to an assignable
// user (Active account, role in CASE_OWNER_ROLES).
//
//   npm run migrate:case-owners            dry run - prints a report, writes nothing
//   npm run migrate:case-owners -- --apply writes the "matched" rows only
//
// Applications that already have a Case Owner are never touched. Ambiguous
// (several users with that name) and unmatched names are only reported -
// assign those by hand in the application workspace.
import "dotenv/config";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { getAssignableUsers, writeCaseOwner } from "../caseOwner.js";
import { logActivity, resolveBoardName } from "../activityLog.js";

const APPLY = process.argv.includes("--apply");
const { BOARD_ID, COLUMNS } = ACTIVE_APPLICATIONS;

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

async function getApplications() {
  const query = `
    query ($boardId: ID!, $columnIds: [String!]) {
      boards(ids: [$boardId]) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values(ids: $columnIds) {
              id
              text
              ... on BoardRelationValue {
                linked_item_ids
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(process.env.MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: process.env.MONDAY_API_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { boardId: BOARD_ID, columnIds: [COLUMNS.CASE_OWNER_LEGACY, COLUMNS.CASE_OWNER] },
    }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data.boards[0].items_page.items.map((item) => {
    const columns = Object.fromEntries(item.column_values.map((column) => [column.id, column]));

    return {
      id: item.id,
      name: item.name,
      legacyOwner: columns[COLUMNS.CASE_OWNER_LEGACY]?.text?.trim() ?? "",
      hasOwner: (columns[COLUMNS.CASE_OWNER]?.linked_item_ids?.length ?? 0) > 0,
    };
  });
}

function classify(applications, users) {
  const usersByName = new Map();

  for (const user of users) {
    const key = normalizeName(user.name);
    usersByName.set(key, [...(usersByName.get(key) ?? []), user]);
  }

  const report = { matched: [], ambiguous: [], unmatched: [], alreadyAssigned: 0, blank: 0 };

  for (const application of applications) {
    if (application.hasOwner) {
      report.alreadyAssigned += 1;
      continue;
    }

    if (!application.legacyOwner) {
      report.blank += 1;
      continue;
    }

    const candidates = usersByName.get(normalizeName(application.legacyOwner)) ?? [];

    if (candidates.length === 1) {
      report.matched.push({ application, user: candidates[0] });
    } else if (candidates.length > 1) {
      report.ambiguous.push({ application, candidates });
    } else {
      report.unmatched.push({ application });
    }
  }

  return report;
}

function printReport(report) {
  console.log(`\nMatched (${report.matched.length}):`);
  report.matched.forEach(({ application, user }) =>
    console.log(`  ${application.name} [${application.id}]: "${application.legacyOwner}" -> ${user.name} (${user.role}) [${user.id}]`),
  );

  console.log(`\nAmbiguous - several users with that name (${report.ambiguous.length}):`);
  report.ambiguous.forEach(({ application, candidates }) =>
    console.log(
      `  ${application.name} [${application.id}]: "${application.legacyOwner}" -> ${candidates.map((user) => `${user.role} [${user.id}]`).join(", ")}`,
    ),
  );

  console.log(`\nUnmatched - no assignable user with that name (${report.unmatched.length}):`);
  report.unmatched.forEach(({ application }) =>
    console.log(`  ${application.name} [${application.id}]: "${application.legacyOwner}"`),
  );

  console.log(`\nSkipped: ${report.alreadyAssigned} already have a Case Owner, ${report.blank} have no legacy value.`);
}

async function applyMatches(matched) {
  let failures = 0;

  // Sequential on purpose: a one-off job, and it keeps well inside Monday's
  // rate limits.
  for (const { application, user } of matched) {
    try {
      await writeCaseOwner(application.id, user.id);

      await logActivity({
        actorName: "Case Owner migration",
        boardId: BOARD_ID,
        boardName: resolveBoardName(BOARD_ID),
        itemId: application.id,
        itemName: application.name,
        actionType: "Updated",
        description: `Case Owner migration set Case Owner to "${user.name}" on ${application.name} (from legacy text "${application.legacyOwner}")`,
        fieldChanged: "Case Owner",
        oldValue: "(empty)",
        newValue: user.name,
        raw: { applicationId: application.id, userId: user.id, legacyOwner: application.legacyOwner },
      });

      console.log(`  set ${application.name} -> ${user.name}`);
    } catch (err) {
      failures += 1;
      console.error(`  FAILED ${application.name}: ${err.message}`);
    }
  }

  return failures;
}

async function main() {
  const [applications, users] = await Promise.all([getApplications(), getAssignableUsers()]);
  const report = classify(applications, users);

  printReport(report);

  if (!APPLY) {
    console.log("\nDry run - nothing was written. Re-run with --apply to write the matched rows.");
    return;
  }

  console.log(`\nApplying ${report.matched.length} matched rows...`);
  const failures = await applyMatches(report.matched);

  console.log(`\nDone: ${report.matched.length - failures} written, ${failures} failed.`);
  console.log("The running server may serve cached reads for up to the cache TTL - reload after that.");

  process.exitCode = failures > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
