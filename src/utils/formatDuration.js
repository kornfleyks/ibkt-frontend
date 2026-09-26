// A span of time as "4h 12m", "12m" or "under 1m".
export function formatDuration(ms) {
  const minutes = Math.floor(ms / 60_000);

  if (minutes < 1) {
    return "under 1m";
  }

  const hours = Math.floor(minutes / 60);

  if (hours >= 24) {
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  }

  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}
