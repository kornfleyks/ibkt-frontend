// One-off: sets the Role column to "Super Admin" on Monday for the two
// accounts in SUPER_ADMIN_EMAILS (src/constants/roles.js). Monday creates
// the "Super Admin" label the first time (create_labels_if_missing), the
// same way "Blocked" was added. This is the ONLY place that ever sets this
// role - it can't be set through the app itself (server/users.js refuses
// it for every account, and the Users page never offers it as an option).
//
//   node scripts/seedSuperAdmins.js
//
// Safe to re-run: an account already on Super Admin is skipped.
import "dotenv/config";
import { USERS } from "../../src/constants/boards/users.js";
import { ROLES, SUPER_ADMIN_EMAILS } from "../../src/constants/roles.js";
import { findUserByEmail } from "../auth.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const ROLE_COLUMN = USERS.COLUMNS.ROLE;

for (const email of SUPER_ADMIN_EMAILS) {
  const user = await findUserByEmail(email);

  if (!user) {
    console.log(`${email}: no account found - skipped.`);
    continue;
  }

  if (user.role === ROLES.SUPER_ADMIN) {
    console.log(`${email} (${user.id}): already Super Admin.`);
    continue;
  }

  await monday(
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value, create_labels_if_missing: true) { id }
    }`,
    {
      boardId: USERS.BOARD_ID,
      itemId: user.id,
      columnId: ROLE_COLUMN,
      value: JSON.stringify({ label: ROLES.SUPER_ADMIN }),
    },
  );

  console.log(`${email} (${user.id}): ${user.role} -> Super Admin.`);
}

process.exit(0);
