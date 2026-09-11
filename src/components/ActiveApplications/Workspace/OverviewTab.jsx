import { Grid } from "@mui/material";

import InfoRow from "../../Common/InfoRow";
import SectionCard from "../../Common/SectionCard";

function OverviewTab({ application }) {
  return (
    <Grid container spacing={3}>
      <Grid
        size={{
          xs: 12,
          md: 6,
        }}
      >
        <SectionCard title="Applicant Information">
          <InfoRow label="Name" value={application.name} />

          <InfoRow label="Email" value={application.email} />

          <InfoRow label="Phone" value={application.phone} />

          <InfoRow label="Country" value={application.country} />

          <InfoRow label="City" value={application.city} />
        </SectionCard>
      </Grid>

      <Grid
        size={{
          xs: 12,
          md: 6,
        }}
      >
        <SectionCard title="Case Information">
          <InfoRow label="Adoption Stage" value={application.adoptionStage} />

          <InfoRow label="Priority" value={application.priority} />

          <InfoRow label="Case Owner" value={application.caseOwner} />

          <InfoRow
            label="Assigned Volunteer"
            value={application.assignedVolunteer}
          />

          <InfoRow label="Case Health" value={application.caseHealth} />
        </SectionCard>
      </Grid>

      <Grid
        size={{
          xs: 12,
        }}
      >
        <SectionCard title="Application Details">
          <InfoRow label="Why Adopt" value={application.whyAdopt} />

          <InfoRow
            label="Adoption Motivation"
            value={application.adoptionMotivation}
          />

          <InfoRow
            label="Previous Cat Experience"
            value={application.previousCatExperience}
          />

          <InfoRow label="Household" value={application.householdInformation} />

          <InfoRow label="Existing Pets" value={application.existingPets} />

          <InfoRow label="Work Schedule" value={application.workSchedule} />
        </SectionCard>
      </Grid>

      <Grid
        size={{
          xs: 12,
        }}
      >
        <SectionCard title="AI Review">
          <InfoRow
            label="Recommendation"
            value={application.aiRecommendation || "—"}
          />

          <InfoRow label="Summary" value={application.aiSummary || "—"} />

          <InfoRow label="Concerns" value={application.aiConcerns || "—"} />

          <InfoRow
            label="Missing Information"
            value={application.aiMissingInformation || "—"}
          />

          <InfoRow
            label="Suggested Next Action"
            value={application.suggestedNextAction || "—"}
          />

          <InfoRow
            label="Suggested Questions"
            value={application.suggestedQuestions || "—"}
          />
        </SectionCard>
      </Grid>
    </Grid>
  );
}

export default OverviewTab;
