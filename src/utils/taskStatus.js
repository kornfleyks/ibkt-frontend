import { TASKS_STATUS_OPTIONS } from "../constants/statuses/tasksStatuses";

const { STATUS } = TASKS_STATUS_OPTIONS;

// "Open" = still needs doing. Used by the Tasks page tabs and the overdue flag.
export const OPEN_TASK_STATUSES = [STATUS.NEW, STATUS.IN_PROGRESS, STATUS.WAITING];

export function isTaskOpen(task) {
  return OPEN_TASK_STATUSES.includes(task.status);
}

// Local-date "YYYY-MM-DD", the same shape Monday returns for date columns,
// so due dates compare as plain strings without timezone shifts.
export function todayDateString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

export function isTaskOverdue(task, today = todayDateString()) {
  return isTaskOpen(task) && Boolean(task.dueDate) && task.dueDate < today;
}
