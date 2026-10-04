import { mondayRequest, changeMondayColumnValue, serverPost, serverGet, serverDelete } from "./MondayService";
import { USERS } from "../constants/boards/users";
import { mapUser } from "./mappers/UserMapper";
import { isDatabaseBoard } from "./DatabaseBoardsService";

// Users come from the database (server/users.js) when the server has the
// "users" board switched on, otherwise from Monday as before.
const inDatabase = () => isDatabaseBoard("users");

async function changeUser(userId, changes, mondayChange) {
  if (await inDatabase()) {
    return serverPost(`/api/admin/users/${userId}`, changes);
  }

  return mondayChange();
}

export async function getUsers() {
  if (await inDatabase()) {
    return serverGet("/api/users/names");
  }

  const query = `
        query ($boardId: ID!) {
            boards(ids: [$boardId]) {
                items_page(limit: 500) {
                    items {
                        id
                        name
                    }
                }
            }
        }
    `;

  const data = await mondayRequest(query, {
    boardId: USERS.BOARD_ID,
  });

  return data.boards[0].items_page.items.map((item) => ({
    id: item.id,
    name: item.name,
  }));
}

// Admin-created account: Active immediately. The password is the admin's
// own choice/generated one from the form - never emailed (server/userAdmin.js).
// Resolves to { user }.
export async function createUser({ firstName, lastName, email, role, password }) {
  return serverPost("/api/admin/users", { firstName, lastName, email, role, password });
}

// Never fetches PASSWORD_HASH - that stays server-side, this is only for
// the account-management page (name/email/role/status).
export async function getAllUsersFull() {
  if (await inDatabase()) {
    const users = await serverGet("/api/admin/users");

    return users.map((user) => ({ ...user, lastLogin: user.lastLogin ? new Date(user.lastLogin) : null }));
  }

  const query = `
        query ($boardId: ID!) {
            boards(ids: [$boardId]) {
                items_page(limit: 500) {
                    items {
                        id
                        column_values(ids: [
                            "${USERS.COLUMNS.FIRST_NAME}",
                            "${USERS.COLUMNS.LAST_NAME}",
                            "${USERS.COLUMNS.EMAIL}",
                            "${USERS.COLUMNS.ROLE}",
                            "${USERS.COLUMNS.ACCOUNT_STATUS}",
                            "${USERS.COLUMNS.LAST_LOGIN}"
                        ]) {
                            id
                            text
                            value
                        }
                    }
                }
            }
        }
    `;

  const data = await mondayRequest(query, {
    boardId: USERS.BOARD_ID,
  });

  return data.boards[0].items_page.items.map(mapUser);
}

export async function updateUserFirstName(userId, firstName) {
  return changeUser(userId, { firstName }, () =>
    changeMondayColumnValue(USERS.BOARD_ID, userId, USERS.COLUMNS.FIRST_NAME, firstName),
  );
}

export async function updateUserLastName(userId, lastName) {
  return changeUser(userId, { lastName }, () =>
    changeMondayColumnValue(USERS.BOARD_ID, userId, USERS.COLUMNS.LAST_NAME, lastName),
  );
}

export async function updateUserEmail(userId, email) {
  return changeUser(userId, { email }, () =>
    changeMondayColumnValue(USERS.BOARD_ID, userId, USERS.COLUMNS.EMAIL, { email, text: email }),
  );
}

// Through the server, not the Monday proxy (which refuses this column):
// Suspend/Archive hand the user's open cases and tasks to the acting Admin
// first, and the server's live account state has to change with it.
// Resolves to { accountStatus, reassigned: { cases, tasks } }.
export async function setUserStatus(userId, status) {
  return serverPost(`/api/admin/users/${userId}/status`, { status });
}

// { cases: [{ id, name, stage }], tasks: [{ id, name, status }] } still open
// and owned by the user - what a Suspend/Archive would hand over.
export async function getUserOpenWork(userId) {
  return serverGet(`/api/admin/users/${userId}/open-work`);
}

// Sends a real test email to this user's address through Mailgun -
// confirms the whole path works (email_log row, then its delivery webhook).
// Resolves to { ok, email } or throws with Mailgun's own error message.
export async function sendTestEmail(userId) {
  return serverPost(`/api/admin/users/${userId}/send-test-email`, {});
}

// Permanent: deletes the Monday item and database row right away. Open
// cases/tasks are reassigned to the caller first (server/userAdmin.js).
// Resolves to { ok, reassigned: { cases, tasks } }.
export async function deleteUser(userId) {
  return serverDelete(`/api/admin/users/${userId}`);
}

export async function updateUserRole(userId, role) {
  return changeUser(userId, { role }, () =>
    changeMondayColumnValue(USERS.BOARD_ID, userId, USERS.COLUMNS.ROLE, {
      label: role,
    }),
  );
}

// Goes through a dedicated server endpoint, not the generic Monday proxy -
// hashing has to happen server-side, never in the browser.
export async function resetUserPassword(userId, newPassword) {
  return serverPost(`/api/admin/users/${userId}/password`, { newPassword });
}

// { id, name, role, accountStatus, email, phone: { number, country } } -
// the card shown when an @mention is clicked. Any signed-in user may read
// it; served from the server's memory, so it costs no Monday call.
export async function getUserProfileCard(userId) {
  const { user } = await serverGet(`/api/users/${userId}/profile-card`);

  return user;
}
