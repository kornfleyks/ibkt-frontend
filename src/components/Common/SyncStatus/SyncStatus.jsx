import { useCallback, useEffect, useState } from "react";
import { Box, Button, CircularProgress, Link, Tooltip, Typography } from "@mui/material";
import { getSyncStatus, runSyncNow } from "../../../services/SyncService";
import { formatRelativeTime } from "../../../utils/relativeTime";
import SyncFailuresDialog from "./SyncFailuresDialog";

const REFRESH_MS = 60_000;

const RUN_STATES = {
  done: { text: "Done", color: "success.main" },
  partial: { text: "Partly done", color: "warning.main" },
  failed: { text: "Failed", color: "error.main" },
  running: { text: "Running", color: "info.main" },
};

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

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function formatNextRun(iso) {
  if (!iso) return "not scheduled here";

  return new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

// The nightly sync that sends the database's changes to Monday (App
// Settings, next to the Database card): last run, changes waiting or failed
// (with Monday's reasons), and "Run now".
function SyncStatus() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [failuresOpen, setFailuresOpen] = useState(false);

  const refresh = useCallback(() => {
    return getSyncStatus()
      .then((data) => {
        setStatus({ ...data, checkedAt: Date.now() });
        setError(null);
      })
      .catch((err) => setError(err?.message || "No response."));
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);

    return () => clearInterval(timer);
  }, [refresh]);

  async function handleRunNow() {
    setRunning(true);
    setRunResult(null);

    try {
      const result = await runSyncNow();
      setRunResult({
        ok: result.status === "done",
        text: `${plural(result.sent, "change")} sent${result.failed ? `, ${result.failed} failed` : ""} (${plural(result.mondayCalls, "Monday call")}).${result.note ? ` ${result.note}` : ""}`,
      });
    } catch (err) {
      setRunResult({ ok: false, text: err?.message || "The sync didn't run." });
    } finally {
      setRunning(false);
      refresh();
    }
  }

  const lastRun = status?.lastRun;
  const runState = lastRun ? RUN_STATES[lastRun.status] ?? RUN_STATES.failed : null;
  const header = error
    ? { text: "Unreachable", color: "error.main" }
    : !status
      ? { text: "Checking...", color: "text.secondary" }
      : !status.enabled
        ? { text: "Not set up", color: "text.secondary" }
        : status.running
          ? RUN_STATES.running
          : status.failed > 0
            ? { text: "Needs attention", color: "warning.main" }
            : status.scheduled
              ? { text: "Scheduled", color: "success.main" }
              : { text: "Manual only", color: "text.secondary" };

  const lastRunText = lastRun
    ? `${runState.text}, ${formatRelativeTime(new Date(lastRun.started_at), new Date(status.checkedAt))}`
    : "never";

  return (
    <>
    <Tooltip
      title="Changes saved in the database reach Monday once a night, in a few Monday calls. Failed changes are retried up to 5 times; Admins get a notification when one gives up."
      placement="right"
    >
      <Box sx={{ px: "10px" }} aria-label={`Monday sync: ${header.text}`}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Monday Sync
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: header.color }} />
            <Typography variant="caption" sx={{ color: header.color, fontWeight: 500 }}>
              {header.text}
            </Typography>
          </Box>
        </Box>

        {error && (
          <Typography variant="caption" sx={{ display: "block", color: "error.main" }}>
            {error}
          </Typography>
        )}

        {status && !status.enabled && (
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
            DATABASE_URL isn&apos;t set on this server, so there is nothing to sync.
          </Typography>
        )}

        {status?.enabled && (
          <>
            <Row label="Last run" value={lastRunText} color={runState?.color ?? "text.secondary"} />
            {lastRun && (
              <Row
                label="Sent"
                value={`${plural(lastRun.sent, "change")} · ${plural(lastRun.monday_calls, "call")}`}
                color={lastRun.failed ? "warning.main" : "text.secondary"}
              />
            )}
            {lastRun?.error && (
              <Typography variant="caption" sx={{ display: "block", color: "warning.main", textAlign: "right" }}>
                {lastRun.error}
              </Typography>
            )}
            <Row label="Waiting" value={plural(status.waiting, "change")} />
            {status.failed > 0 ? (
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Failed
                </Typography>
                <Link
                  component="button"
                  variant="caption"
                  onClick={() => setFailuresOpen(true)}
                  sx={{ color: "error.main", fontWeight: 500, textAlign: "right" }}
                >
                  {`${plural(status.failed, "change")} (details)`}
                </Link>
              </Box>
            ) : (
              <Row label="Failed" value={plural(status.failed, "change")} />
            )}
            <Row label="Next run" value={formatNextRun(status.nextRunAt)} />

            {status.blockedForSeconds > 0 && (
              <Typography variant="caption" sx={{ display: "block", color: "warning.main" }}>
                Monday is limiting requests right now; the sync waits for it.
              </Typography>
            )}

            {status.failed > 0 && (
              <Button size="small" onClick={() => setFailuresOpen(true)} sx={{ mt: 0.5, px: 0, minHeight: 0 }}>
                {`Show failures (${status.failed})`}
              </Button>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleRunNow}
                disabled={running || status.running || status.waiting === 0}
                startIcon={running ? <CircularProgress size={14} /> : null}
              >
                {running ? "Syncing..." : "Run now"}
              </Button>
              {status.waiting === 0 && !running && (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Nothing waiting
                </Typography>
              )}
            </Box>

            {runResult && (
              <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: runResult.ok ? "success.main" : "warning.main" }}>
                {runResult.text}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Tooltip>

    <SyncFailuresDialog open={failuresOpen} onClose={() => setFailuresOpen(false)} />
    </>
  );
}

export default SyncStatus;
