import { USERS } from "../../constants/boards/users";

export function mapUser(item) {
  const columns = Object.fromEntries(
    item.column_values.map((column) => [column.id, column]),
  );

  return {
    id: item.id,
    firstName: columns[USERS.COLUMNS.FIRST_NAME]?.text || "",
    lastName: columns[USERS.COLUMNS.LAST_NAME]?.text || "",
    email: columns[USERS.COLUMNS.EMAIL]?.text || "",
    role: columns[USERS.COLUMNS.ROLE]?.text || "",
    accountStatus: columns[USERS.COLUMNS.ACCOUNT_STATUS]?.text || "",
  };
}
