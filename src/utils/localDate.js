const pad = (number) => String(number).padStart(2, "0");

// Today in the browser's time zone, as "YYYY-MM-DD".
export function todayLocal() {
  const now = new Date();

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Whole days from `from` to `to` ("YYYY-MM-DD" each); negative when `to`
// is earlier.
export function daysBetween(from, to) {
  const toUtc = (date) => {
    const [year, month, day] = date.split("-").map(Number);

    return Date.UTC(year, month - 1, day);
  };

  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

// "YYYY-MM-DD" plus a number of days, as "YYYY-MM-DD".
export function addDays(date, days) {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
