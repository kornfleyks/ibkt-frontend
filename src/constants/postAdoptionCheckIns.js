import { POST_ADOPTION } from "./boards/postAdoption.js";
import { POST_ADOPTION_STATUS_OPTIONS } from "./statuses/postAdoptionStatuses.js";

const C = POST_ADOPTION.COLUMNS;

// Every check-in status column has the same labels.
export const CHECK_IN_STATUS = POST_ADOPTION_STATUS_OPTIONS.CHECK_IN_24H_CHECK_IN_STATUS;

// The post-adoption check-in schedule, in order. Each is due `offset` after
// the schedule's start (the Arrival Date, else the Adoption Date - see
// server/postAdoption/rules.js). `statusField` / `dueField` are the record's
// fields (server/postAdoption/fields.js).
export const CHECK_INS = [
  { key: "24h", label: "24 hours", statusField: "checkIn24hStatus", dueField: "checkIn24hDue", statusColumn: C.CHECK_IN_24H_CHECK_IN_STATUS, dueColumn: C.CHECK_IN_24H_DUE, offset: { days: 1 } },
  { key: "72h", label: "72 hours", statusField: "checkIn72hStatus", dueField: "checkIn72hDue", statusColumn: C.CHECK_IN_72H_CHECK_IN_STATUS, dueColumn: C.CHECK_IN_72H_DUE, offset: { days: 3 } },
  { key: "week1", label: "Week 1", statusField: "week1Status", dueField: "week1Due", statusColumn: C.WEEK_1_CHECK_IN_STATUS, dueColumn: C.WEEK_1_CHECK_IN_DUE, offset: { days: 7 } },
  { key: "week2", label: "Week 2", statusField: "week2Status", dueField: "week2Due", statusColumn: C.WEEK_2_CHECK_IN_STATUS, dueColumn: C.WEEK_2_CHECK_IN_DUE, offset: { days: 14 } },
  { key: "week3", label: "Week 3", statusField: "week3Status", dueField: "week3Due", statusColumn: C.WEEK_3_CHECK_IN_STATUS, dueColumn: C.WEEK_3_CHECK_IN_DUE, offset: { days: 21 } },
  { key: "week4", label: "Week 4", statusField: "week4Status", dueField: "week4Due", statusColumn: C.WEEK_4_CHECK_IN_STATUS, dueColumn: C.WEEK_4_CHECK_IN_DUE, offset: { days: 28 } },
  { key: "month3", label: "3 months", statusField: "month3Status", dueField: "month3Due", statusColumn: C.CHECK_IN_3_MONTH_CHECK_IN_STATUS, dueColumn: C.CHECK_IN_3_MONTH_DUE, offset: { months: 3 } },
  { key: "month6", label: "6 months", statusField: "month6Status", dueField: "month6Due", statusColumn: C.CHECK_IN_6_MONTH_CHECK_IN_STATUS, dueColumn: C.CHECK_IN_6_MONTH_DUE, offset: { months: 6 } },
  { key: "year1", label: "1 year", statusField: "year1Status", dueField: "year1Due", statusColumn: C.CHECK_IN_1_YEAR_CHECK_IN_STATUS, dueColumn: C.CHECK_IN_1_YEAR_DUE, offset: { months: 12 } },
];

// A check-in not answered yet whose due date has passed. `today`: "YYYY-MM-DD".
export function isCheckInOverdue(status, dueDate, today) {
  const waiting = !status || [CHECK_IN_STATUS.NOT_DUE, CHECK_IN_STATUS.SENT, CHECK_IN_STATUS.NO_RESPONSE].includes(status);

  return Boolean(dueDate) && waiting && dueDate < today;
}
