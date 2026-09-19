import { POST_ADOPTION } from "../../constants/boards/postAdoption";

export function mapPostAdoption(item) {
  const columns = Object.fromEntries(
    item.column_values.map((column) => [column.id, column]),
  );

  return {
    id: item.id,
    name: item.name,
    status: columns[POST_ADOPTION.COLUMNS.POST_ADOPTION_STATUS]?.text ?? "N/A",
    escalationRequired: columns[POST_ADOPTION.COLUMNS.ESCALATION_REQUIRED]?.text ?? "N/A",
  };
}
