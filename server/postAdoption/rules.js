import { CHECK_INS, CHECK_IN_STATUS } from "../../src/constants/postAdoptionCheckIns.js";
import { POST_ADOPTION_STATUS_OPTIONS } from "../../src/constants/statuses/postAdoptionStatuses.js";

// The post-adoption rules, as pure functions of the record before, the
// changes asked for and today's date - no storage, so they're the same in
// database and Monday mode (and easy to check on their own). Agreed with
// the user 2026-09-28:
//   - due dates count from the Arrival Date, else the Adoption Date;
//   - when that start date changes, only check-ins still "Not Due" move;
//   - a check-in marked Sent: Last Check-In Sent = today, Chase Count + 1;
//     marked Received: Last Response Received = today;
//   - All Required Check-Ins Complete follows whether all 9 are Received.
// A value the user sets explicitly in the same change always wins.

const YES = POST_ADOPTION_STATUS_OPTIONS.ALL_REQUIRED_CHECK_INS_COMPLETE.YES;
const NO = POST_ADOPTION_STATUS_OPTIONS.ALL_REQUIRED_CHECK_INS_COMPLETE.NO;

// "YYYY-MM-DD" + { days } or { months }. Month ends clamp (31 Jan + 1 month
// = 28/29 Feb), so a schedule never skips into the next month.
export function addToDate(date, { days = 0, months = 0 }) {
  const [year, month, day] = date.split("-").map(Number);
  const targetMonth = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  const result = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), Math.min(day, lastDay) + days));

  return result.toISOString().slice(0, 10);
}

export function scheduleStart(record) {
  return record.arrivalDate || record.adoptionDate || null;
}

// { [dueField]: date } for every check-in, from `start`.
export function dueDatesFrom(start) {
  return Object.fromEntries(CHECK_INS.map((checkIn) => [checkIn.dueField, addToDate(start, checkIn.offset)]));
}

// The fields a new record starts with.
export function initialValues({ adoptionDate, arrivalDate, activeStatus }) {
  const start = arrivalDate || adoptionDate;

  return {
    status: activeStatus,
    adoptionDate: adoptionDate || null,
    arrivalDate: arrivalDate || null,
    ...Object.fromEntries(CHECK_INS.map((checkIn) => [checkIn.statusField, CHECK_IN_STATUS.NOT_DUE])),
    ...(start ? dueDatesFrom(start) : {}),
    chaseCount: 0,
    allCheckInsComplete: NO,
  };
}

// `changes` plus what the rules add. `before` is the stored record.
export function withRules(before, changes, today) {
  const out = { ...changes };
  const after = { ...before, ...changes };
  const explicit = (key) => Object.hasOwn(changes, key);

  // Rescheduling: only when the start actually moved, only "Not Due" ones.
  const oldStart = scheduleStart(before);
  const newStart = scheduleStart(after);

  if (newStart && newStart !== oldStart) {
    const dates = dueDatesFrom(newStart);

    for (const checkIn of CHECK_INS) {
      const status = after[checkIn.statusField];
      const notStarted = !status || status === CHECK_IN_STATUS.NOT_DUE;

      if (notStarted && !explicit(checkIn.dueField)) {
        out[checkIn.dueField] = dates[checkIn.dueField];
      }
    }
  }

  // Chasing and responses, for statuses that changed in this request.
  let sent = 0;
  let received = false;

  for (const checkIn of CHECK_INS) {
    if (!explicit(checkIn.statusField) || changes[checkIn.statusField] === before[checkIn.statusField]) continue;

    if (changes[checkIn.statusField] === CHECK_IN_STATUS.SENT) sent += 1;
    if (changes[checkIn.statusField] === CHECK_IN_STATUS.RECEIVED) received = true;
  }

  if (sent && !explicit("lastCheckInSent")) out.lastCheckInSent = today;
  if (sent && !explicit("chaseCount")) out.chaseCount = (Number(before.chaseCount) || 0) + sent;
  if (received && !explicit("lastResponseReceived")) out.lastResponseReceived = today;

  // Completion follows the statuses.
  if (!explicit("allCheckInsComplete")) {
    const merged = { ...after, ...out };
    const complete = CHECK_INS.every((checkIn) => merged[checkIn.statusField] === CHECK_IN_STATUS.RECEIVED) ? YES : NO;

    if (complete !== before.allCheckInsComplete && (complete === YES || before.allCheckInsComplete === YES)) {
      out.allCheckInsComplete = complete;
    }
  }

  return out;
}
