import {
  mondayRequest,
  createMondayItem,
  changeMondayColumnValue,
  getColumnSettings,
} from "./MondayService";
import { TASKS } from "../constants/boards/tasks";
import { mapTask } from "./mappers/TaskMapper";
import { TASKS_STATUS_OPTIONS } from "../constants/statuses/tasksStatuses";

const TASK_ITEM_FIELDS = `
    id
    name
    column_values {
        id
        type
        text
        value
        ... on BoardRelationValue {
            display_value
            linked_items {
                id
                name
            }
        }
    }
`;

export async function getTasks() {
  const query = `
        query ($boardId: ID!) {
            boards(ids: [$boardId]) {
                items_page(limit: 500) {
                    items {
                        ${TASK_ITEM_FIELDS}
                    }
                }
            }
        }
    `;

  const data = await mondayRequest(query, {
    boardId: TASKS.BOARD_ID,
  });

  return data.boards[0].items_page.items.map(mapTask);
}

// No server-side filter by linked-item is set up for this board, so this
// fetches everything and filters client-side - same approach the rest of
// the app already uses for per-entity lists (e.g. getAvailableCats).
export async function getCatTasks(catId) {
  const tasks = await getTasks();

  return tasks.filter((task) => task.linkedCatId === String(catId));
}

// The Task dropdown's option list lives on the column definition, not on
// any item, so it has to be fetched separately (same as Cats Breed/Colour).
export async function getTaskTitleOptions() {
  const columns = await getColumnSettings(TASKS.BOARD_ID, [TASKS.COLUMNS.TASK]);
  const settingsStr = columns.find((column) => column.id === TASKS.COLUMNS.TASK)?.settings_str;

  if (!settingsStr) {
    return [];
  }

  try {
    const labels = JSON.parse(settingsStr).labels;

    return Array.isArray(labels) ? labels.map((label) => label.name) : [];
  } catch {
    return [];
  }
}

export async function createCatTask(
  catId,
  { title, status, priority, dueDate, ownerId, waitingReason, description },
) {
  const columnValues = {
    [TASKS.COLUMNS.TASK]: { labels: [title] },
    [TASKS.COLUMNS.STATUS]: { label: status },
    [TASKS.COLUMNS.PRIORITY]: { label: priority },
    [TASKS.COLUMNS.LINKED_CAT]: { item_ids: [Number(catId)] },
    [TASKS.COLUMNS.TASK_DESCRIPTION]: { text: description },
  };

  if (dueDate) {
    columnValues[TASKS.COLUMNS.DUE_DATE] = { date: dueDate };
  }

  if (ownerId) {
    columnValues[TASKS.COLUMNS.OWNER] = { item_ids: [Number(ownerId)] };
  }

  if (status === TASKS_STATUS_OPTIONS.STATUS.WAITING && waitingReason) {
    columnValues[TASKS.COLUMNS.WAITING_REASON] = { text: waitingReason };
  }

  const itemId = await createMondayItem(TASKS.BOARD_ID, title, columnValues, {
    createLabelsIfMissing: true,
  });

  return getTask(itemId);
}

export async function getTask(taskId) {
  const query = `
        query ($boardId: ID!, $itemId: ID!) {
            boards(ids: [$boardId]) {
                items_page(query_params: { ids: [$itemId] }) {
                    items {
                        ${TASK_ITEM_FIELDS}
                    }
                }
            }
        }
    `;

  const data = await mondayRequest(query, {
    boardId: TASKS.BOARD_ID,
    itemId: taskId,
  });

  const item = data.boards[0].items_page.items[0];

  return item ? mapTask(item) : null;
}

export async function updateTaskTitle(taskId, title) {
  return changeMondayColumnValue(
    TASKS.BOARD_ID,
    taskId,
    TASKS.COLUMNS.TASK,
    { labels: [title] },
    { createLabelsIfMissing: true },
  );
}

export async function updateTaskStatus(taskId, status) {
  return changeMondayColumnValue(TASKS.BOARD_ID, taskId, TASKS.COLUMNS.STATUS, {
    label: status,
  });
}

export async function updateTaskPriority(taskId, priority) {
  return changeMondayColumnValue(TASKS.BOARD_ID, taskId, TASKS.COLUMNS.PRIORITY, {
    label: priority,
  });
}

export async function updateTaskDueDate(taskId, dueDate) {
  return changeMondayColumnValue(TASKS.BOARD_ID, taskId, TASKS.COLUMNS.DUE_DATE, {
    date: dueDate,
  });
}

export async function updateTaskOwner(taskId, ownerId) {
  return changeMondayColumnValue(TASKS.BOARD_ID, taskId, TASKS.COLUMNS.OWNER, {
    item_ids: ownerId ? [Number(ownerId)] : [],
  });
}

export async function updateTaskWaitingReason(taskId, waitingReason) {
  return changeMondayColumnValue(TASKS.BOARD_ID, taskId, TASKS.COLUMNS.WAITING_REASON, {
    text: waitingReason,
  });
}

export async function updateTaskDescription(taskId, description) {
  return changeMondayColumnValue(TASKS.BOARD_ID, taskId, TASKS.COLUMNS.TASK_DESCRIPTION, {
    text: description,
  });
}
