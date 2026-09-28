import { DATE_FORMATS, DEFAULT_PREFERENCES } from "../constants/preferences";

// Dates in the user's chosen format (Settings > Date format). Components
// normally use the useDateFormat hook, which supplies the format.

function pad(number) {
  return String(number).padStart(2, "0");
}

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

// "" for a missing or invalid date.
export function formatDate(date, format = DEFAULT_PREFERENCES.dateFormat) {
  if (!isValidDate(date)) {
    return "";
  }

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  switch (format) {
    case DATE_FORMATS.DMY:
      return `${day}/${month}/${year}`;
    case DATE_FORMATS.ISO:
      return `${year}-${month}-${day}`;
    default:
      return `${month}/${day}/${year}`;
  }
}

// Date plus hours:minutes (the time keeps the browser's 12/24-hour style).
export function formatDateTime(date, format = DEFAULT_PREFERENCES.dateFormat) {
  if (!isValidDate(date)) {
    return "";
  }

  return `${formatDate(date, format)} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// A "YYYY-MM-DD..." string (e.g. a Monday date column's text) as a local
// date. `new Date(string)` would read it as UTC midnight and can show the
// previous day west of UTC. Null if it doesn't start with a date.
export function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");

  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
