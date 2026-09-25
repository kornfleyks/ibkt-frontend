import { parseUtcDateTime } from "../../utils/mondayDateTime";
import { ACTIVITY_LOG } from "../../constants/boards/activityLog";

export function mapActivityLogEntry(item) {
  const columns = Object.fromEntries(
    item.column_values.map((column) => [column.id, column]),
  );

  const date = columns[ACTIVITY_LOG.COLUMNS.TIMESTAMP]?.text || "";

  return {
    id: item.id,
    timestamp: date,
    occurredAt: parseUtcDateTime(columns[ACTIVITY_LOG.COLUMNS.TIMESTAMP]?.value),
    actorName: columns[ACTIVITY_LOG.COLUMNS.ACTOR_NAME]?.text || "",
    actorId: columns[ACTIVITY_LOG.COLUMNS.ACTOR_ID]?.text || "",
    board: columns[ACTIVITY_LOG.COLUMNS.BOARD]?.text || "",
    boardId: columns[ACTIVITY_LOG.COLUMNS.TARGET_BOARD_ID]?.text || "",
    itemName: columns[ACTIVITY_LOG.COLUMNS.ITEM_NAME]?.text || "",
    itemId: columns[ACTIVITY_LOG.COLUMNS.TARGET_ITEM_ID]?.text || "",
    actionType: columns[ACTIVITY_LOG.COLUMNS.ACTION_TYPE]?.text || "",
    description: columns[ACTIVITY_LOG.COLUMNS.DESCRIPTION]?.text || "",
    fieldChanged: columns[ACTIVITY_LOG.COLUMNS.FIELD_CHANGED]?.text || "",
    oldValue: columns[ACTIVITY_LOG.COLUMNS.OLD_VALUE]?.text || "",
    newValue: columns[ACTIVITY_LOG.COLUMNS.NEW_VALUE]?.text || "",
  };
}
