// Monday date columns' `text` is rendered in the Monday account's timezone,
// but their raw `value` holds exactly what was written - for the columns
// this app's server writes (Activity Log Timestamp, Users Last Login) that
// is UTC date + time. Parsing the value gives a correct Date for every
// viewer. Null if missing or unparseable.
export function parseUtcDateTime(rawValue) {
  try {
    const { date, time } = JSON.parse(rawValue || "{}");

    if (!date) {
      return null;
    }

    const parsed = new Date(`${date}T${time || "00:00:00"}Z`);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}
