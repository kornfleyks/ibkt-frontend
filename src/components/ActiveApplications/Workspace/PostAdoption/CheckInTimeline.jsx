import { useState } from "react";
import { Box, Chip, CircularProgress, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography, Alert } from "@mui/material";
import SectionCard from "../../../Common/SectionCard";
import { CHECK_INS, CHECK_IN_STATUS, isCheckInOverdue } from "../../../../constants/postAdoptionCheckIns";
import { CHECK_IN_COLORS } from "./statusColors";
import { POST_ADOPTION_STATUS_OPTIONS } from "../../../../constants/statuses/postAdoptionStatuses";
import useDateFormat from "../../../../hooks/useDateFormat";
import { todayLocal } from "../../../../utils/localDate";

const STATUS_OPTIONS = Object.values(CHECK_IN_STATUS);
const COMPLETE = POST_ADOPTION_STATUS_OPTIONS.ALL_REQUIRED_CHECK_INS_COMPLETE.YES;

// One check-in: its due date and status, both saved as soon as they change.
function CheckInRow({ checkIn, record, save, muted }) {
  const { formatDateString } = useDateFormat();
  const [saving, setSaving] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const status = record[checkIn.statusField] || CHECK_IN_STATUS.NOT_DUE;
  const due = record[checkIn.dueField];
  const overdue = !muted && isCheckInOverdue(record[checkIn.statusField], due, todayLocal());

  async function change(changes) {
    setSaving(true);

    try {
      await save(changes);
    } catch {
      // The tab shows the error.
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 1.5,
        py: 1,
        px: 1.5,
        borderLeft: 3,
        borderColor: overdue ? "error.main" : status === CHECK_IN_STATUS.RECEIVED ? "success.main" : "divider",
      }}
    >
      <Typography sx={{ fontWeight: 600, minWidth: 90 }}>{checkIn.label}</Typography>

      <Box sx={{ minWidth: 150 }}>
        {editingDate ? (
          <TextField
            size="small"
            type="date"
            autoFocus
            defaultValue={due}
            disabled={saving}
            onBlur={(event) => {
              setEditingDate(false);

              if (event.target.value !== (due || "")) change({ [checkIn.dueField]: event.target.value || null });
            }}
            sx={{ "& input": { minWidth: 130 } }}
          />
        ) : (
          <Typography
            role="button"
            tabIndex={0}
            onClick={() => setEditingDate(true)}
            onKeyDown={(event) => event.key === "Enter" && setEditingDate(true)}
            color={overdue ? "error" : "text.secondary"}
            sx={{ cursor: "pointer", textDecoration: "underline dotted" }}
          >
            {due ? `Due ${formatDateString(due)}` : "No due date"}
          </Typography>
        )}
      </Box>

      <TextField
        select
        size="small"
        value={status}
        disabled={saving}
        onChange={(event) => change({ [checkIn.statusField]: event.target.value })}
        sx={{ minWidth: 150 }}
      >
        {STATUS_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>

      {status !== CHECK_IN_STATUS.NOT_DUE && <Chip label={status} size="small" color={CHECK_IN_COLORS[status] ?? "default"} />}
      {overdue && <Chip label="Overdue" size="small" color="error" variant="outlined" />}
      {saving && <CircularProgress size={16} sx={{ color: "text.secondary" }} />}
    </Box>
  );
}

// The 9 check-ins in order. Marking one Sent records today as the last
// check-in sent and adds to the chase count; Received records today as the
// last response (the server does this, in both storage modes).
function CheckInTimeline({ record, save }) {
  const [savingStop, setSavingStop] = useState(false);

  async function toggleStopChasing(event) {
    setSavingStop(true);

    try {
      await save({ stopChasing: event.target.checked });
    } catch {
      // The tab shows the error.
    } finally {
      setSavingStop(false);
    }
  }

  return (
    <SectionCard title="Check-ins">
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
          <FormControlLabel
            control={<Switch checked={Boolean(record.stopChasing)} onChange={toggleStopChasing} disabled={savingStop} />}
            label="Stop chasing"
          />

          <Chip
            label={record.allCheckInsComplete === COMPLETE ? "All check-ins complete" : "Check-ins in progress"}
            size="small"
            color={record.allCheckInsComplete === COMPLETE ? "success" : "default"}
          />
        </Stack>

        {!CHECK_INS.some((checkIn) => record[checkIn.dueField]) && (
          <Alert severity="info">No due dates yet. Set the arrival or adoption date in the summary to schedule them.</Alert>
        )}

        <Stack spacing={0.5}>
          {CHECK_INS.map((checkIn) => (
            <CheckInRow key={checkIn.key} checkIn={checkIn} record={record} save={save} muted={Boolean(record.stopChasing)} />
          ))}
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Click a due date to change it. Sent sets the last check-in date and adds to the chase count; Received sets the last response date.
        </Typography>
      </Stack>
    </SectionCard>
  );
}

export default CheckInTimeline;
