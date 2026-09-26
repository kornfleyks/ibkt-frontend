import { useEffect, useState } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { getServerHealth } from "../../../services/ServerHealthService";
import { formatDuration } from "../../../utils/formatDuration";
import { formatRelativeTime } from "../../../utils/relativeTime";

const REFRESH_MS = 60_000;
// Longer than this and the server was most likely asleep (Render's free
// plan takes ~30-60s to wake).
const WAKING_AFTER_MS = 3_000;
// Started this recently = it has just woken up (or been redeployed).
const JUST_WOKE_SECONDS = 120;
// Render sleeps after ~15 min without requests; a keep-alive monitor should
// ping more often than that.
const PING_OVERDUE_MS = 15 * 60_000;

const STATUS = {
  checking: { text: "Checking...", color: "text.secondary" },
  waking: { text: "Waking up...", color: "warning.main" },
  awake: { text: "Awake", color: "success.main" },
  unreachable: { text: "Unreachable", color: "error.main" },
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

// The keep-alive row: on Render, the outcome of the server's own self-ping;
// elsewhere (no public URL), any outside monitor's pings, or "off".
// { text, warn, detail } - `detail` is an extra warning line (the error).
function describeKeepAlive(health) {
  const at = new Date(health.checkedAt);
  const ago = (iso) => formatRelativeTime(new Date(iso), at);
  const overdue = (iso) => !iso || health.checkedAt - new Date(iso).getTime() > PING_OVERDUE_MS;
  const { keepAlive } = health;

  if (keepAlive?.enabled) {
    if (!keepAlive.lastAt) {
      return { text: `self-ping every ${keepAlive.intervalMinutes} min, first one shortly`, warn: false };
    }

    if (!keepAlive.ok) {
      return {
        text: `self-ping failed ${ago(keepAlive.lastAt)}`,
        warn: true,
        detail: keepAlive.error,
      };
    }

    return {
      text: `self-ping ${ago(keepAlive.lastAt)}, OK (${keepAlive.responseMs} ms)`,
      warn: overdue(keepAlive.lastAt),
    };
  }

  if (health.lastPingAt) {
    return { text: `last ping ${ago(health.lastPingAt)}`, warn: overdue(health.lastPingAt) };
  }

  return { text: "off (not on Render)", warn: false };
}

// The app server's health (App Settings, next to the Monday API usage):
// awake or not, uptime, response time and the keep-alive monitor's last
// ping. Only talks to our server - never Monday.
function ServerHealthStatus() {
  const [status, setStatus] = useState("checking");
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Per effect run (not a ref): React's development double-mount must
    // not leave the second run thinking a check is still in flight.
    let inFlight = false;

    async function check() {
      if (inFlight) {
        return;
      }

      inFlight = true;
      const slow = setTimeout(() => !cancelled && setStatus("waking"), WAKING_AFTER_MS);

      try {
        const data = await getServerHealth();

        if (!cancelled) {
          // Stamped here, not during render, so the view stays pure.
          setHealth({ ...data, checkedAt: Date.now() });
          setError(null);
          setStatus("awake");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "No response.");
          setStatus("unreachable");
        }
      } finally {
        clearTimeout(slow);
        inFlight = false;
      }
    }

    check();
    const timer = setInterval(check, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const current = STATUS[status];
  const justWoke = status === "awake" && health?.uptimeSeconds < JUST_WOKE_SECONDS;
  const wasAsleep = status === "awake" && health?.responseMs > WAKING_AFTER_MS;
  const since = health ? new Date(health.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  // Only once the first check has answered - until then there is no data.
  const keepAlive = health ? describeKeepAlive(health) : null;

  return (
    <Tooltip
      title="The app's server. On Render's free plan it sleeps after ~15 min without requests; on Render it pings its own /api/health every 10 min to stay awake."
      placement="right"
    >
      <Box sx={{ px: "10px" }} aria-label={`Server: ${current.text}`}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Server
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: current.color }} />
            <Typography variant="caption" sx={{ color: current.color, fontWeight: 500 }}>
              {justWoke ? "Just woke up" : current.text}
            </Typography>
          </Box>
        </Box>

        {status === "unreachable" && (
          <Typography variant="caption" sx={{ display: "block", color: "error.main" }}>
            {error}
          </Typography>
        )}

        {health && status !== "unreachable" && (
          <>
            <Row label="Up for" value={`${formatDuration(health.uptimeSeconds * 1000)} (since ${since})`} />
            <Row
              label="Response"
              value={wasAsleep ? `${(health.responseMs / 1000).toFixed(1)}s (was asleep)` : `${health.responseMs} ms`}
              color={wasAsleep ? "warning.main" : "text.secondary"}
            />
            <Row label="Keep-alive" value={keepAlive.text} color={keepAlive.warn ? "warning.main" : "text.secondary"} />

            {keepAlive.detail && (
              <Typography variant="caption" sx={{ display: "block", color: "warning.main", textAlign: "right" }}>
                {keepAlive.detail}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Tooltip>
  );
}

export default ServerHealthStatus;
