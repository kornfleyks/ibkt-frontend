import { mondayRequest, changeMondayColumnValue, serverPost } from "./MondayService";
import { USERS } from "../constants/boards/users";
import { mapUser } from "./mappers/UserMapper";

export async function getUsers() {
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

// Never fetches PASSWORD_HASH - that stays server-side, this is only for
// the account-management page (name/email/role/status).
export async function getAllUsersFull() {
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
                            "${USERS.COLUMNS.ACCOUNT_STATUS}"
                        ]) {
                            id
                            text
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
  return changeMondayColumnValue(USERS.BOARD_ID, userId, USERS.COLUMNS.FIRST_NAME, firstName);
}

export async function updateUserLastName(userId, lastName) {
  return changeMondayColumnValue(USERS.BOARD_ID, userId, USERS.COLUMNS.LAST_NAME, lastName);
}

export async function updateUserEmail(userId, email) {
  return changeMondayColumnValue(USERS.BOARD_ID, userId, USERS.COLUMNS.EMAIL, { email, text: email });
}

export async function updateUserStatus(userId, status) {
  return changeMondayColumnValue(USERS.BOARD_ID, userId, USERS.COLUMNS.ACCOUNT_STATUS, {
    label: status,
  });
}

export async function updateUserRole(userId, role) {
  return changeMondayColumnValue(USERS.BOARD_ID, userId, USERS.COLUMNS.ROLE, {
    label: role,
  });
}

// Goes through a dedicated server endpoint, not the generic Monday proxy -
// hashing has to happen server-side, never in the browser.
export async function resetUserPassword(userId, newPassword) {
  return serverPost(`/api/admin/users/${userId}/password`, { newPassword });
}
