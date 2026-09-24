import { TASKS } from "../../constants/boards/tasks";

export function mapTask(item) {
  const columns = Object.fromEntries(
    item.column_values.map((column) => [column.id, column]),
  );

  return {
    id: item.id,
    title: columns[TASKS.COLUMNS.TASK]?.text || "N/A",
    status: columns[TASKS.COLUMNS.STATUS]?.text || "N/A",
    priority: columns[TASKS.COLUMNS.PRIORITY]?.text || "N/A",
    dueDate: columns[TASKS.COLUMNS.DUE_DATE]?.text || null,
    ownerId: columns[TASKS.COLUMNS.OWNER]?.linked_items?.[0]?.id ?? null,
    ownerName: columns[TASKS.COLUMNS.OWNER]?.display_value || "Unassigned",
    linkedCatId: columns[TASKS.COLUMNS.LINKED_CAT]?.linked_items?.[0]?.id ?? null,
    linkedCatName: columns[TASKS.COLUMNS.LINKED_CAT]?.linked_items?.[0]?.name ?? "",
    waitingReason: columns[TASKS.COLUMNS.WAITING_REASON]?.text ?? "",
    description: columns[TASKS.COLUMNS.TASK_DESCRIPTION]?.text ?? "",
  };
}
