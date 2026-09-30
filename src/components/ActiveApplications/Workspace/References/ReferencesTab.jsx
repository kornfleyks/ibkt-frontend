import { Chip, Grid, Stack, Typography } from "@mui/material";
import SectionCard from "../../../Common/SectionCard";
import RecordField from "../../../Common/RecordField";
import RefereeCard from "./RefereeCard";
import { ADOPTION_EDITABLE_FIELDS, updateAdoptionField } from "../../../../services/ActiveApplicationsService";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../../../../constants/statuses/activeApplicationsStatuses";

const { REFERENCE_OUTCOME } = ACTIVE_APPLICATIONS_STATUS_OPTIONS;

const OUTCOME_COLORS = {
  [REFERENCE_OUTCOME.POSITIVE]: "success",
  [REFERENCE_OUTCOME.MIXED]: "warning",
  [REFERENCE_OUTCOME.NEGATIVE]: "error",
};

const REFEREES = [
  { field: "referee1", title: "Referee 1" },
  { field: "referee2", title: "Referee 2" },
  { field: "referee3", title: "Referee 3" },
];

// The applicant's referees (from the Adoption Form and References, or typed
// by a volunteer) and the team's view of the references. Every change is
// saved and logged like any application edit.
function ReferencesTab({ application, onApplicationChange }) {
  async function save(field, value) {
    await updateAdoptionField(application.id, field, value);
    onApplicationChange({ [field]: value ?? "" });
  }

  return (
    <Stack spacing={3}>
      <SectionCard title="References">
        <Stack spacing={0.5}>
          <RecordField
            label="References submitted"
            value={application.referencesSubmitted}
            kind="select"
            options={ADOPTION_EDITABLE_FIELDS.referencesSubmitted.options}
            onSave={(value) => save("referencesSubmitted", value)}
          />
          <RecordField
            label="Outcome"
            value={application.referenceOutcome}
            kind="select"
            options={ADOPTION_EDITABLE_FIELDS.referenceOutcome.options}
            onSave={(value) => save("referenceOutcome", value)}
            renderValue={(value) =>
              value ? (
                <Chip label={value} size="small" color={OUTCOME_COLORS[value] ?? "default"} />
              ) : (
                <Typography color="text.secondary">Not set</Typography>
              )
            }
          />
          <RecordField
            label="Notes"
            value={application.referenceNotes}
            kind="longText"
            onSave={(value) => save("referenceNotes", value)}
          />
        </Stack>
      </SectionCard>

      <SectionCard title="Referees">
        <Grid container spacing={2}>
          {REFEREES.map(({ field, title }) => (
            <Grid key={field} size={{ xs: 12, md: 4 }}>
              <RefereeCard title={title} value={application[field]} onSave={(text) => save(field, text)} />
            </Grid>
          ))}
        </Grid>
      </SectionCard>

      <SectionCard title="Reference checks">
        <Typography color="text.secondary">
          The referees&apos; own answers (the &quot;Reference Check&quot; Jotform form) will appear here once that form is
          connected to the app.
        </Typography>
      </SectionCard>
    </Stack>
  );
}

export default ReferencesTab;
