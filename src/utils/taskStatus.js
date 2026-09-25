import { TASKS_STATUS_OPTIONS } from "../constants/statuses/tasksStatuses";
import { canSeeTask } from "./ownership";

const { STATUS } = TASKS_STATUS_OPTIONS;

// "Open" = still needs doing. Used by the Tasks page tabs and the overdue flag.
export const OPEN_TASK_STATUSES = [STATUS.NEW, STATUS.IN_PROGRESS, STATUS.WAITING];

export function isTaskOpen(task) {
  return OPEN_TASK_STATUSES.includes(task.status);
}

// Local-date "YYYY-MM-DD", the same shape Monday returns for date columns,
// so due dates compare as plain strings without timezone shifts.
export function todayDateString() {
  return dateStringInDays(0);
}

// "YYYY-MM-DD" for today plus `days`, in local time.
export function dateStringInDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

export function isTaskOverdue(task, today = todayDateString()) {
  return isTaskOpen(task) && Boolean(task.dueDate) && task.dueDate < today;
}

// Open tasks with a due date that `user` may see (canSeeTask), soonest
// first (so overdue ones lead). Each is flagged `beyondWindow` when due
// later than `days` from today - sorted order puts those after every
// in-window task, so a list can show in-window tasks first and fill any
// spare slots with the next ones. Tasks without a due date aren't
// "upcoming" and are left out.
export function selectUpcomingTasks(tasks, user, days) {
  const lastDay = dateStringInDays(days);

  return tasks
    .filter((task) => canSeeTask(task, user) && isTaskOpen(task) && task.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((task) => ({ ...task, beyondWindow: task.dueDate > lastDay }));
}

// Due dates are "YYYY-MM-DD"; `new Date(string)` would read that as UTC
// midnight and can show the previous day west of UTC.
export function formatDueDate(dueDate) {
  const [year, month, day] = dueDate.slice(0, 10).split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString();
}
