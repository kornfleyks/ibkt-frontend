import { TASKS } from "../../constants/boards/tasks";

export function mapTask(item) {
  const columns = Object.fromEntries(
    item.column_values.map((column) => [column.id, column]),
  );

  return {
    id: item.id,
    name: item.name,
    status: columns[TASKS.COLUMNS.STATUS]?.text ?? "N/A",
    priority: columns[TASKS.COLUMNS.PRIORITY]?.text ?? "N/A",
    dueDate: columns[TASKS.COLUMNS.DUE_DATE]?.text || null,
  };
}
