import { useCallback } from "react";
import { Chip, Grid, Stack, Typography, Alert } from "@mui/material";
import SectionCard from "../../../Common/SectionCard";
import InfoRow from "../../../Common/InfoRow";
import EditableInfoRow from "../../../Common/EditableInfoRow";
import UserPicker from "../../../Common/UserPicker";
import LinkedCatChips from "../../../Common/LinkedCatChips";
import RecordField from "./RecordField";
import { RECORD_STATUS_COLORS, ESCALATION_COLORS, AI_FLAG_COLORS } from "./statusColors";
import { nextCheckIn, overdueCount, dueText } from "./checkInProgress";
import { getPostAdoptionOwnerOptions } from "../../../../services/PostAdoptionService";
import { POST_ADOPTION_STATUS_OPTIONS } from "../../../../constants/statuses/postAdoptionStatuses";
import useDateFormat from "../../../../hooks/useDateFormat";
import { todayLocal } from "../../../../utils/localDate";

const STATUS_OPTIONS = Object.values(POST_ADOPTION_STATUS_OPTIONS.POST_ADOPTION_STATUS);
const LABEL_WIDTH = 190;

function StatusChip({ label, value, colors }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Chip label={value || "Not set"} size="small" color={colors[value] ?? "default"} variant={value ? "filled" : "outlined"} />
    </Stack>
  );
}

// Status at a glance (record status, escalation, AI flag, next check-in),
// the owner and the dates the schedule counts from. The cats shown are the
// application's (a bonded group is several; the record's own Linked Cat
// holds one, and is empty on records made on Monday).
function PostAdoptionSummary({ applicationId, linkedCats, record, save }) {
  const { formatDateString } = useDateFormat();
  const today = todayLocal();
  const next = nextCheckIn(record, today);
  const overdue = overdueCount(record, today);
  const loadOwners = useCallback(() => getPostAdoptionOwnerOptions(applicationId), [applicationId]);

  return (
    <SectionCard title="Summary">
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
          <StatusChip label="Post-adoption status" value={record.status} colors={RECORD_STATUS_COLORS} />
          <StatusChip label="Escalation" value={record.escalationRequired} colors={ESCALATION_COLORS} />
          <StatusChip label="AI concern flag" value={record.aiConcernFlag} colors={AI_FLAG_COLORS} />
        </Stack>

        {record.stopChasing ? (
          <Alert severity="info">Chasing is stopped for this adoption, so overdue check-ins aren't flagged.</Alert>
        ) : next ? (
          <Alert severity={next.overdue ? "warning" : "info"}>
            {`Next check-in: ${next.checkIn.label}, ${formatDateString(next.due)} (${dueText(next.days)})`}
            {overdue > 1 ? `. ${overdue} check-ins are overdue.` : ""}
          </Alert>
        ) : !record.arrivalDate && !record.adoptionDate ? (
          <Alert severity="warning">Set an arrival or adoption date below to schedule the check-ins.</Alert>
        ) : null}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <RecordField label="Status" kind="select" options={STATUS_OPTIONS} value={record.status} onSave={(status) => save({ status })} />

            <EditableInfoRow
              label="Owner"
              renderDisplay={() => <InfoRow label="Owner" labelWidth={LABEL_WIDTH} value={record.ownerName || "Unassigned"} />}
              getEditValue={() => (record.ownerId ? { id: record.ownerId, name: record.ownerName } : null)}
              renderEditor={(value, setValue, saving) => (
                <UserPicker label="Owner" value={value} onChange={setValue} loadUsers={loadOwners} disabled={saving} />
              )}
              onSave={(value) => ((value?.id ?? null) === record.ownerId ? Promise.resolve() : save({ ownerId: value?.id ?? null }))}
            />

            <InfoRow
              label={linkedCats.length > 1 ? "Cats" : "Cat"}
              labelWidth={LABEL_WIDTH}
              value={<LinkedCatChips cats={linkedCats} clickable emptyText="Not matched yet" />}
            />
            <InfoRow label="Location" labelWidth={LABEL_WIDTH} value={[record.city, record.country].filter(Boolean).join(", ") || "Not set"} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <RecordField label="Adoption date" kind="date" value={record.adoptionDate} onSave={(adoptionDate) => save({ adoptionDate })} />
            <RecordField label="Arrival date" kind="date" value={record.arrivalDate} onSave={(arrivalDate) => save({ arrivalDate })} />
            <RecordField label="Closed date" kind="date" value={record.closedDate} onSave={(closedDate) => save({ closedDate })} />
            <InfoRow label="Last check-in sent" labelWidth={LABEL_WIDTH} value={record.lastCheckInSent ? formatDateString(record.lastCheckInSent) : "Not yet"} />
            <InfoRow
              label="Last response"
              labelWidth={LABEL_WIDTH}
              value={record.lastResponseReceived ? formatDateString(record.lastResponseReceived) : "Not yet"}
            />
            <InfoRow label="Chase count" labelWidth={LABEL_WIDTH} value={String(Number(record.chaseCount) || 0)} />
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary">
          Check-ins are due from the arrival date (or the adoption date while there's none). Changing it moves only check-ins that are still Not
          Due.
        </Typography>
      </Stack>
    </SectionCard>
  );
}

export default PostAdoptionSummary;
