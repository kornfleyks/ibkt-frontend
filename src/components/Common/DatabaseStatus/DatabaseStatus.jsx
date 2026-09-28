import { useEffect, useState } from "react";
import { Box, Button, LinearProgress, Tooltip, Typography } from "@mui/material";
import { getDatabaseHealth } from "../../../services/DatabaseHealthService";
import { formatRelativeTime } from "../../../utils/relativeTime";
import { formatBytes } from "../../../utils/formatBytes";

const REFRESH_MS = 60_000;

function Row({ label, value, color = "text.secondary" }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ color, fontWeight: 500, textAlign: "right" }}>
        {value}
      </Typography>
    </Box>
  );
}

// The Supabase database that shadows Monday during the trial (App Settings,
// next to API Requests and Server): space used against the free 500 MB, the
// live copy's status, and rows/space per table. (Today's request count is
// the Database Requests counter in the API Requests card.)
function DatabaseStatus() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [showTables, setShowTables] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function check() {
      getDatabaseHealth()
        .then((data) => {
          if (!cancelled) {
            setHealth({ ...data, checkedAt: Date.now() });
            setError(null);
          }
        })
        .catch((err) => !cancelled && setError(err?.message || "No response."));
    }

    check();
    const timer = setInterval(check, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const state = error
    ? { text: "Unreachable", color: "error.main" }
    : !health
      ? { text: "Checking...", color: "text.secondary" }
      : !health.enabled
        ? { text: "Not set up", color: "text.secondary" }
        : health.connected
          ? { text: "Connected", color: "success.main" }
          : { text: "Offline", color: "error.main" };

  const ratio = health?.connected ? Math.min(health.databaseBytes / health.limitBytes, 1) : 0;
  const barColor = ratio >= 0.9 ? "error" : ratio >= 0.75 ? "warning" : "primary";
  const mirror = health?.mirror;
  const lastCopy = mirror?.lastAt ? formatRelativeTime(new Date(mirror.lastAt), new Date(health.checkedAt)) : "none yet";

  return (
    <Tooltip
      title="Supabase database that keeps a copy of the Monday data (not files) during the trial. The free plan allows 500 MB, which includes Supabase's own internal data."
      placement="right"
    >
      <Box sx={{ px: "10px" }} aria-label={`Database: ${state.text}`}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Database
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: state.color }} />
            <Typography variant="caption" sx={{ color: state.color, fontWeight: 500 }}>
              {state.text}
            </Typography>
          </Box>
        </Box>

        {(error || (health?.enabled && !health.connected)) && (
          <Typography variant="caption" sx={{ display: "block", color: "error.main" }}>
            {error || health.error}
          </Typography>
        )}

        {health && !health.enabled && (
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
            DATABASE_URL isn&apos;t set on this server, so nothing is copied.
          </Typography>
        )}

        {health?.connected && (
          <>
            <Row label="Space" value={`${formatBytes(health.databaseBytes)} / ${formatBytes(health.limitBytes)}`} />
            <LinearProgress variant="determinate" value={ratio * 100} color={barColor} sx={{ height: 4, borderRadius: 2, my: 0.5 }} />
            <Row
              label="Copied today"
              value={`${mirror.mirroredToday} change${mirror.mirroredToday === 1 ? "" : "s"}${mirror.failedToday ? `, ${mirror.failedToday} failed` : ""}`}
              color={mirror.failedToday ? "warning.main" : "text.secondary"}
            />
            <Row label="Last copy" value={lastCopy} />

            {mirror.lastError && mirror.failedToday > 0 && (
              <Typography variant="caption" sx={{ display: "block", color: "warning.main", textAlign: "right" }}>
                {mirror.lastError.message}
              </Typography>
            )}

            <Button size="small" onClick={() => setShowTables((open) => !open)} sx={{ mt: 0.5, px: 0, minHeight: 0 }}>
              {showTables ? "Hide tables" : `Show tables (${health.tables.length})`}
            </Button>

            {showTables &&
              health.tables.map((table) => (
                <Row key={table.name} label={table.name} value={`${table.rows.toLocaleString()} rows · ${formatBytes(table.bytes)}`} />
              ))}
          </>
        )}
      </Box>
    </Tooltip>
  );
}

export default DatabaseStatus;
