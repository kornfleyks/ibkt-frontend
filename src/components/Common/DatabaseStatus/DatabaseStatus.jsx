import { useEffect, useState } from "react";
import { Box, Button, InputAdornment, LinearProgress, TextField, Tooltip, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { getDatabaseHealth } from "../../../services/DatabaseHealthService";
import { formatRelativeTime } from "../../../utils/relativeTime";
import { formatBytes } from "../../../utils/formatBytes";
import TableRowsDialog from "./TableRowsDialog";

const REFRESH_MS = 60_000;

const tableButton = {
  display: "block",
  width: "100%",
  p: 0,
  border: 0,
  bgcolor: "transparent",
  cursor: "pointer",
  font: "inherit",
  textAlign: "inherit",
  borderRadius: 0.5,
  "&:hover": { bgcolor: "action.hover" },
  "&:hover .MuiTypography-root:first-of-type": { color: "primary.main", textDecoration: "underline" },
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

// The Supabase database that shadows Monday during the trial (App Settings,
// next to API Requests and Server): space used against the free 500 MB, the
// live copy's status, and rows/space per table. (Today's request count is
// the Database Requests counter in the API Requests card.)
function DatabaseStatus() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [showTables, setShowTables] = useState(false);
  const [openTable, setOpenTable] = useState(null);
  const [tableSearch, setTableSearch] = useState("");

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
  const search = tableSearch.trim().toLowerCase();
  const shownTables = (health?.tables ?? []).filter((table) => table.name.toLowerCase().includes(search));

  function toggleTables() {
    setShowTables((open) => !open);
    setTableSearch("");
  }

  return (
    <>
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

              <Button size="small" onClick={toggleTables} sx={{ mt: 0.5, px: 0, minHeight: 0 }}>
                {showTables ? "Hide tables" : `Show tables (${health.tables.length})`}
              </Button>

              {showTables && (
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search tables"
                  value={tableSearch}
                  onChange={(event) => setTableSearch(event.target.value)}
                  slotProps={{
                    htmlInput: { "aria-label": "Search tables" },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ my: 0.5, "& .MuiInputBase-input": { py: 0.5, fontSize: "0.75rem" } }}
                />
              )}

              {showTables && shownTables.length === 0 && (
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                  No tables match &quot;{tableSearch.trim()}&quot;.
                </Typography>
              )}

              {showTables &&
                shownTables.map((table) => (
                  <Box
                    key={table.name}
                    component="button"
                    type="button"
                    onClick={() => setOpenTable(table.name)}
                    aria-label={`Show the rows of ${table.name}`}
                    sx={tableButton}
                  >
                    <Row label={table.name} value={`${table.rows.toLocaleString()} rows · ${formatBytes(table.bytes)}`} />
                  </Box>
                ))}
            </>
          )}
        </Box>
      </Tooltip>
      {/* Outside the Tooltip: events from the dialog would otherwise open it. */}
      <TableRowsDialog key={openTable ?? ""} table={openTable} onClose={() => setOpenTable(null)} />
    </>
  );
}

export default DatabaseStatus;
