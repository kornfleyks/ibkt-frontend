import {
  mondayRequest,
  createMondayItem,
  changeMondayColumnValue,
  getColumnSettings,
  serverGet,
  serverPost,
} from "./MondayService";
import { isDatabaseBoard } from "./DatabaseBoardsService";
import { TASKS } from "../constants/boards/tasks";
import { mapTask } from "./mappers/TaskMapper";
import { TASKS_STATUS_OPTIONS } from "../constants/statuses/tasksStatuses";

// Tasks come from the database (server/tasks.js) when the server has the
// "tasks" board switched on, otherwise from Monday as before. Both give the
// same task shape (see TaskMapper).
const inDatabase = () => isDatabaseBoard("tasks");

// One field change, through the server when the board is in the database.
async function changeTask(taskId, changes, mondayChange) {
  if (await inDatabase()) {
    return serverPost(`/api/tasks/${taskId}`, changes);
  }

  return mondayChange();
}

const TASK_ITEM_FIELDS = `
    id
    name
    created_at
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

// The database sends createdAt as an ISO string (JSON has no Date type);
// Monday mode's mapTask() already gives a Date, straight from `created_at`.
function withCreatedAtDate(task) {
  return { ...task, createdAt: task.createdAt ? new Date(task.createdAt) : null };
}

export async function getTasks() {
  if (await inDatabase()) {
    return (await serverGet("/api/tasks")).map(withCreatedAtDate);
  }

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
//
// `link`: { catId } or { applicationId } - the tasks on that cat or
// application.
export async function getLinkedTasks({ catId, applicationId }) {
  const tasks = await getTasks();

  if (catId) {
    return tasks.filter((task) => task.linkedCatId === String(catId));
  }

  return tasks.filter((task) => task.linkedApplicationId === String(applicationId));
}

// The Task dropdown's option list lives on the column definition, not on
// any item, so it has to be fetched separately (same as Cats Breed/Colour).
export async function getTaskTitleOptions() {
  if (await inDatabase()) {
    return serverGet("/api/tasks/title-options");
  }

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

// `link`: { catId?, applicationId? } - what the task is on (at least one).
export async function createTask(
  { catId, applicationId },
  { title, status, priority, dueDate, ownerId, waitingReason, description },
) {
  if (await inDatabase()) {
    return withCreatedAtDate(
      await serverPost("/api/tasks", {
        catId: catId ? String(catId) : null,
        applicationId: applicationId ? String(applicationId) : null,
        title,
        status,
        priority,
        dueDate: dueDate || null,
        ownerId: ownerId ?? null,
        waitingReason: status === TASKS_STATUS_OPTIONS.STATUS.WAITING ? waitingReason ?? "" : "",
        description: description ?? "",
      }),
    );
  }

  const columnValues = {
    [TASKS.COLUMNS.TASK]: { labels: [title] },
    [TASKS.COLUMNS.STATUS]: { label: status },
    [TASKS.COLUMNS.PRIORITY]: { label: priority },
    [TASKS.COLUMNS.TASK_DESCRIPTION]: { text: description },
  };

  if (catId) {
    columnValues[TASKS.COLUMNS.LINKED_CAT] = { item_ids: [Number(catId)] };
  }

  if (applicationId) {
    columnValues[TASKS.COLUMNS.LINKED_ADOPTION] = { item_ids: [Number(applicationId)] };
  }

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
  if (await inDatabase()) {
    const task = await serverGet(`/api/tasks/${taskId}`);

    return task ? withCreatedAtDate(task) : null;
  }

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
  return changeTask(taskId, { title }, () =>
    changeMondayColumnValue(
      TASKS.BOARD_ID,
      taskId,
      TASKS.COLUMNS.TASK,
      { labels: [title] },
      { createLabelsIfMissing: true },
    ),
  );
}

export async function updateTaskStatus(taskId, status) {
  return changeTask(taskId, { status }, () =>
    changeMondayColumnValue(TASKS.BOARD_ID, taskId, TASKS.COLUMNS.STATUS, {
      label: status,
    }),
  );
}

export async function updateTaskPriority(taskId, priority) {
  return changeTask(taskId, { priority }, () =>
    changeMondayColumnValue(TASKS.BOARD_ID, taskId, TASKS.COLUMNS.PRIORITY, {
      label: priority,
    }),
  );
}

export async function updateTaskDueDate(taskId, dueDate) {
  return changeTask(taskId, { dueDate: dueDate || null }, () =>
    changeMondayColumnValue(TASKS.BOARD_ID, taskId, TASKS.COLUMNS.DUE_DATE, {
      date: dueDate,
    }),
  );
}

export async function updateTaskOwner(taskId, ownerId) {
  return changeTask(taskId, { ownerId: ownerId ?? null }, () =>
    changeMondayColumnValue(TASKS.BOARD_ID, taskId, TASKS.COLUMNS.OWNER, {
      item_ids: ownerId ? [Number(ownerId)] : [],
    }),
  );
}

export async function updateTaskWaitingReason(taskId, waitingReason) {
  return changeTask(taskId, { waitingReason }, () =>
    changeMondayColumnValue(TASKS.BOARD_ID, taskId, TASKS.COLUMNS.WAITING_REASON, {
      text: waitingReason,
    }),
  );
}

export async function updateTaskDescription(taskId, description) {
  return changeTask(taskId, { description }, () =>
    changeMondayColumnValue(TASKS.BOARD_ID, taskId, TASKS.COLUMNS.TASK_DESCRIPTION, {
      text: description,
    }),
  );
}
