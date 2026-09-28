import { CHECK_INS, CHECK_IN_STATUS, isCheckInOverdue } from "../../../../constants/postAdoptionCheckIns";
import { daysBetween } from "../../../../utils/localDate";

const ANSWERED = [CHECK_IN_STATUS.RECEIVED, CHECK_IN_STATUS.CONCERN];

// The first check-in still waiting for an answer that has a due date:
// { checkIn, due, days (negative = overdue), overdue } or null.
export function nextCheckIn(record, today) {
  const checkIn = CHECK_INS.find((entry) => record[entry.dueField] && !ANSWERED.includes(record[entry.statusField]));

  if (!checkIn) return null;

  const due = record[checkIn.dueField];

  return { checkIn, due, days: daysBetween(today, due), overdue: isCheckInOverdue(record[checkIn.statusField], due, today) };
}

export function overdueCount(record, today) {
  return CHECK_INS.filter((entry) => isCheckInOverdue(record[entry.statusField], record[entry.dueField], today)).length;
}

// "Due today", "Due in 3 days", "Overdue by 2 days".
export function dueText(days) {
  if (days === 0) return "Due today";

  const count = Math.abs(days);
  const unit = count === 1 ? "day" : "days";

  return days > 0 ? `Due in ${count} ${unit}` : `Overdue by ${count} ${unit}`;
}
