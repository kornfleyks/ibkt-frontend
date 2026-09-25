const RELATIVE_UNITS = [
  { unit: "year", seconds: 365 * 24 * 3600 },
  { unit: "month", seconds: 30 * 24 * 3600 },
  { unit: "week", seconds: 7 * 24 * 3600 },
  { unit: "day", seconds: 24 * 3600 },
  { unit: "hour", seconds: 3600 },
  { unit: "minute", seconds: 60 },
];

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

// "just now", "5 minutes ago", "yesterday", ... - null when there's no date.
export function formatRelativeTime(date, now = new Date()) {
  if (!date) {
    return null;
  }

  const elapsedSeconds = (now.getTime() - date.getTime()) / 1000;

  if (elapsedSeconds < 60) {
    return "just now";
  }

  const { unit, seconds } = RELATIVE_UNITS.find((candidate) => elapsedSeconds >= candidate.seconds);

  return relativeFormatter.format(-Math.floor(elapsedSeconds / seconds), unit);
}
