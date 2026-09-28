import { Box, LinearProgress, Tooltip, Typography } from "@mui/material";
import useMondayUsage from "../../../hooks/useMondayUsage";
import useNow from "../../../hooks/useNow";
import { nextMondayLimitReset } from "../../../constants/mondayApiUsage";
import { formatDuration } from "../../../utils/formatDuration";

// Today's Monday API usage, updated after every request, and when the
// allowance resets - midnight UTC normally, or when Monday said a block
// (429) ends. The count starts from Monday's own figure when the server
// starts, then adds every call the server makes. Shown in the sidebar in
// development (Admins only) and on App Settings in every environment.
function MondayUsageCounter({ collapsed }) {
  const usage = useMondayUsage();
  const now = useNow();

  const blocked = Boolean(usage?.blockedUntil && usage.blockedUntil > now);
  const resetAt = blocked ? usage.blockedUntil : nextMondayLimitReset(new Date(now)).getTime();
  const countdown = formatDuration(resetAt - now);
  const resetText = blocked ? `Blocked, back in ${countdown}` : `Resets in ${countdown}`;
  const resetTime = new Date(resetAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const count = usage?.count;
  const limit = usage?.limit;
  const ratio = usage ? Math.min(count / limit, 1) : 0;
  const color = blocked || ratio >= 0.95 ? "error" : ratio >= 0.8 ? "warning" : "primary";
  const label = usage ? `${count.toLocaleString()} / ${limit.toLocaleString()}` : "-";
  const tooltip = `API requests to Monday used today (UTC). ${
    blocked ? "Monday is refusing calls until" : "The allowance resets at"
  } ${resetTime} your time.`;

  if (collapsed) {
    return (
      <Tooltip title={`API Requests: ${label}. ${resetText}. ${tooltip}`} placement="right">
        <Typography
          variant="caption"
          sx={{ display: "block", textAlign: "center", color: blocked ? "error.main" : "text.secondary", mt: 1 }}
        >
          {usage ? count : "-"}
        </Typography>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltip} placement="right">
      <Box sx={{ px: "10px", mt: 1 }} aria-label={`API requests today: ${label}. ${resetText}.`}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            API Requests
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: blocked || ratio >= 0.8 ? `${color}.main` : "text.secondary", fontWeight: 500 }}
          >
            {label}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={blocked ? 100 : ratio * 100}
          color={color}
          sx={{ height: 4, borderRadius: 2 }}
        />
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 0.5, color: blocked ? "error.main" : "text.secondary" }}
        >
          {resetText}
        </Typography>
      </Box>
    </Tooltip>
  );
}

export default MondayUsageCounter;
