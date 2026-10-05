import { USERS } from "../src/constants/boards/users.js";
import { ROLES, isSuperAdminEmail } from "../src/constants/roles.js";
import { isDatabaseBoard } from "./database/switches.js";
import { allUsers, userById, setUserValues } from "./database/usersStore.js";
import { optionLabels, actorOf, send, InputError } from "./database/boardRecords.js";
import { applyAccountChange } from "./accountState.js";
import { logActivity } from "./activityLog.js";

// The Users page and user pickers when Users is kept in the database
// ("users" in DATABASE_BOARDS; database-first plan 4.8). Same access as
// before: any signed-in user gets names (e.g. the task Owner picker), only
// Admins the account details and changes (the Monday route already refused
// Users changes from non-Admins). Status and passwords keep their own
// endpoints (userAdmin.js, index.js). Nothing here returns password data.
//
//   GET  /api/users/names        [{ id, name }]
//   GET  /api/admin/users        [{ id, firstName, lastName, email, role, accountStatus, lastLogin, createdAt }]
//   POST /api/admin/users/:id    any of { firstName, lastName, email, role }

const U = USERS.COLUMNS;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const ID_PATTERN = /^\d+$/;

const EDITABLE = {
  firstName: { column: U.FIRST_NAME, label: "First Name" },
  lastName: { column: U.LAST_NAME, label: "Last Name" },
  email: { column: U.EMAIL, label: "Email" },
  role: { column: U.ROLE, label: "Role" },
};

function adminView(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus,
    lastLogin: user.lastLoginIso,
    createdAt: user.createdAt,
  };
}

// Checked changes -> Monday-format column values (what usersStore takes).
async function toColumnValues(userId, changes) {
  const values = {};

  for (const [key, raw] of Object.entries(changes)) {
    if (!EDITABLE[key]) throw new InputError(`"${key}" can't be changed here.`);

    const value = typeof raw === "string" ? raw.trim() : raw;

    if (key === "firstName" || key === "lastName") {
      if (!value || value.length > MAX_NAME_LENGTH) throw new InputError(`Names must be 1-${MAX_NAME_LENGTH} characters.`);
      values[EDITABLE[key].column] = value;
    } else if (key === "email") {
      if (!EMAIL_PATTERN.test(value ?? "")) throw new InputError("Enter a valid email address.");

      const taken = (await allUsers()).some((user) => user.id !== String(userId) && user.email.trim().toLowerCase() === value.toLowerCase());

      if (taken) throw new InputError("An account with this email already exists.");
      values[EDITABLE[key].column] = { email: value, text: value };
    } else {
      // Super Admin is only ever set directly on Monday (scripts/seedSuperAdmins.js
      // or by hand) - never through this page, for anyone.
      if (value === ROLES.SUPER_ADMIN) throw new InputError("Super Admin can't be set here.");
      if (!(await optionLabels("users", U.ROLE)).includes(value)) throw new InputError(`Unknown role "${value}".`);
      values[EDITABLE[key].column] = { label: value };
    }
  }

  return values;
}

async function changeUser(req, userId, changes) {
  const before = await userById(userId);

  if (!before) return null;

  // Fully protected, for every viewer including each other (role is also
  // never selectable as Super Admin, above): nothing about these two
  // accounts changes through this page.
  if (isSuperAdminEmail(before.email)) throw new InputError("This account can't be changed here.");

  if (!Object.keys(changes).length) throw new InputError("Nothing to change.");

  await setUserValues(userId, await toColumnValues(userId, changes));

  const after = await userById(userId);

  // requireAuth, mentions and profile cards read accounts from memory.
  applyAccountChange(userId, { role: after.role, firstName: after.firstName, lastName: after.lastName, email: after.email });

  const actor = actorOf(req);
  const itemName = after.name || `${after.firstName} ${after.lastName}`.trim();

  for (const key of Object.keys(changes)) {
    const from = before[key] || "(empty)";
    const to = after[key] || "(empty)";

    if (from === to) continue;

    logActivity({
      actorId: actor.id,
      actorName: actor.name,
      boardId: USERS.BOARD_ID,
      boardName: "Users",
      itemId: userId,
      itemName,
      actionType: "Updated",
      description: `${actor.name} changed ${EDITABLE[key].label} from "${from}" to "${to}" on ${itemName}`,
      fieldChanged: EDITABLE[key].label,
      oldValue: from,
      newValue: to,
      raw: { userId, [key]: to },
    });
  }

  return adminView(after);
}

export function registerUserRoutes(app, { requireAuth, requireAdmin }) {
  const onlyInDatabase = (req, res, next) =>
    isDatabaseBoard("users") ? next() : res.status(409).json({ error: "Users are still kept on Monday on this server." });

  app.get("/api/users/names", requireAuth, onlyInDatabase, (req, res) =>
    send(res, allUsers().then((users) => users.map((user) => ({ id: user.id, name: user.name }))), "users request"),
  );

  app.get("/api/admin/users", requireAuth, requireAdmin, onlyInDatabase, (req, res) =>
    send(res, allUsers().then((users) => users.map(adminView)), "users request"),
  );

  app.post("/api/admin/users/:id", requireAuth, requireAdmin, onlyInDatabase, (req, res) => {
    if (!ID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Invalid user id." });

    send(res, changeUser(req, req.params.id, req.body ?? {}), "users request");
  });
}
