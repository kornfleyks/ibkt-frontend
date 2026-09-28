import { Box, Tooltip, Typography } from "@mui/material";
import useDatabaseUsage from "../../../hooks/useDatabaseUsage";
import useNow from "../../../hooks/useNow";
import { nextMondayLimitReset } from "../../../constants/mondayApiUsage";
import { formatDuration } from "../../../utils/formatDuration";

// Today's database (Supabase mirror) requests, updated after every request -
// the counterpart of MondayUsageCounter, shown under it. Supabase's free
// plan has no daily request limit, so there's no bar; the count restarts at
// midnight UTC, the same day as the Monday count.
function DatabaseUsageCounter({ collapsed }) {
  const usage = useDatabaseUsage();
  const now = useNow();

  const countdown = formatDuration(nextMondayLimitReset(new Date(now)).getTime() - now);
  const count = usage ? usage.count.toLocaleString() : "-";
  const tooltip = "Requests this server sent to the database today (UTC). Supabase's free plan has no daily limit on requests.";

  if (collapsed) {
    return (
      <Tooltip title={`Database Requests: ${count} today. Resets in ${countdown}. ${tooltip}`} placement="right">
        <Typography variant="caption" sx={{ display: "block", textAlign: "center", color: "text.secondary", mt: 1 }}>
          {usage ? usage.count : "-"}
        </Typography>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltip} placement="right">
      <Box sx={{ px: "10px", mt: 1.5 }} aria-label={`Database requests today: ${count}. Resets in ${countdown}.`}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Database Requests
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
            {count} today
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
          No daily limit (Supabase free) · Resets in {countdown}
        </Typography>
      </Box>
    </Tooltip>
  );
}

export default DatabaseUsageCounter;
