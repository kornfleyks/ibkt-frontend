import { Chip, Divider, Stack, Typography } from "@mui/material";
import SectionCard from "../../../Common/SectionCard";
import RecordField from "../../../Common/RecordField";
import { ESCALATION_COLORS } from "./statusColors";
import { POST_ADOPTION_STATUS_OPTIONS } from "../../../../constants/statuses/postAdoptionStatuses";

const { ESCALATION_REQUIRED } = POST_ADOPTION_STATUS_OPTIONS;
const ESCALATION_OPTIONS = Object.values(ESCALATION_REQUIRED);

// What the adopter reported, the escalation, and internal notes. Setting
// Escalation to Urgent notifies the Case Owner and every Admin (server).
function UpdatesSection({ record, save }) {
  return (
    <SectionCard title="Updates and concerns">
      <Stack spacing={1}>
        <RecordField
          label="Escalation required"
          kind="select"
          options={ESCALATION_OPTIONS}
          value={record.escalationRequired}
          onSave={(escalationRequired) => save({ escalationRequired })}
          renderValue={(value) =>
            value ? <Chip label={value} size="small" color={ESCALATION_COLORS[value] ?? "default"} /> : <Typography color="text.secondary">Not set</Typography>
          }
        />

        {record.escalationRequired !== ESCALATION_REQUIRED.URGENT && (
          <Typography variant="caption" color="text.secondary">
            Setting Urgent notifies the Case Owner and all Admins.
          </Typography>
        )}

        <RecordField label="Escalation notes" kind="longText" value={record.escalationNotes} onSave={(escalationNotes) => save({ escalationNotes })} />

        <Divider sx={{ my: 1 }} />

        <RecordField label="General update" kind="longText" value={record.generalUpdate} onSave={(generalUpdate) => save({ generalUpdate })} />
        <RecordField label="Health update" kind="longText" value={record.healthUpdate} onSave={(healthUpdate) => save({ healthUpdate })} />
        <RecordField label="Behaviour update" kind="longText" value={record.behaviourUpdate} onSave={(behaviourUpdate) => save({ behaviourUpdate })} />

        <Divider sx={{ my: 1 }} />

        <RecordField label="Internal notes" kind="longText" value={record.internalNotes} onSave={(internalNotes) => save({ internalNotes })} />
      </Stack>
    </SectionCard>
  );
}

export default UpdatesSection;
