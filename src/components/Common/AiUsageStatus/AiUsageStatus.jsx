import { useEffect, useState } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { getAiUsage } from "../../../services/AiUsageService";
import { formatRelativeTime } from "../../../utils/relativeTime";

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

function formatCost(period) {
  if (period.cost === 0 && !period.costKnown) return "unknown";

  const text = period.cost < 0.01 && period.cost > 0 ? "< $0.01" : `$${period.cost.toFixed(2)}`;

  return period.costKnown ? text : `${text} +`;
}

const formatTokens = (period) => `${(period.inputTokens + period.cacheReadTokens + period.cacheWriteTokens).toLocaleString()} in, ${period.outputTokens.toLocaleString()} out`;

// What Oriel's calls to the Claude API used (App Settings, next to Database
// and Server): calls, tokens and estimated cost today and this month, and
// the last error. Counted by this server, so it does not include other use
// of the same Anthropic account, and the cost is an estimate from the
// published prices (server/aiUsage/prices.js). Anthropic gives no way to
// read the remaining credit, so none is shown.
function AiUsageStatus() {
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    function check() {
      getAiUsage()
        .then((data) => {
          if (!cancelled) {
            setUsage({ ...data, checkedAt: Date.now() });
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
    : !usage
      ? { text: "Checking...", color: "text.secondary" }
      : !usage.enabled
        ? { text: "Not set up", color: "text.secondary" }
        : usage.lastError && usage.today.failed > 0
          ? { text: "Errors today", color: "warning.main" }
          : usage.month.calls === 0
            ? { text: "No calls yet", color: "text.secondary" }
            : { text: "Working", color: "success.main" };

  const lastCall = usage?.lastCallAt ? formatRelativeTime(new Date(usage.lastCallAt), new Date(usage.checkedAt)) : "none yet";

  return (
    <Tooltip
      title="Calls Oriel made to the Claude API, counted by this server. Other use of the same Anthropic account is not included, the cost is an estimate from the published prices, and Anthropic does not give the remaining credit."
      placement="right"
    >
      <Box sx={{ px: "10px" }} aria-label={`Claude: ${state.text}`}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Claude
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: state.color }} />
            <Typography variant="caption" sx={{ color: state.color, fontWeight: 500 }}>
              {state.text}
            </Typography>
          </Box>
        </Box>

        {error && (
          <Typography variant="caption" sx={{ display: "block", color: "error.main" }}>
            {error}
          </Typography>
        )}

        {usage && !usage.enabled && (
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
            DATABASE_URL isn&apos;t set on this server, so usage is not counted.
          </Typography>
        )}

        {usage?.enabled && (
          <>
            <Row label="Calls today" value={`${usage.today.calls}${usage.today.failed ? `, ${usage.today.failed} failed` : ""}`} color={usage.today.failed ? "warning.main" : "text.secondary"} />
            <Row label="Tokens today" value={formatTokens(usage.today)} />
            <Row label="Cost today" value={formatCost(usage.today)} />
            <Row label="Calls this month" value={usage.month.calls.toLocaleString()} />
            <Row label="Tokens this month" value={formatTokens(usage.month)} />
            <Row label="Cost this month" value={formatCost(usage.month)} />
            <Row label="Last call" value={lastCall} />

            {usage.lastError && usage.today.failed > 0 && (
              <Typography variant="caption" sx={{ display: "block", color: "warning.main", textAlign: "right" }}>
                {usage.lastError.message}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Tooltip>
  );
}

export default AiUsageStatus;
