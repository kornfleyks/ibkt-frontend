import { Grid } from "@mui/material";

import InfoRow from "../../Common/InfoRow";
import EditableInfoRow from "../../Common/EditableInfoRow";
import SectionCard from "../../Common/SectionCard";
import LinkedCatChips from "../../Common/LinkedCatChips";
import UserPicker from "../../Common/UserPicker";
import useCanAssignCaseOwner from "../../../hooks/useCanAssignCaseOwner";
import { assignCaseOwner, getAssignableUsers } from "../../../services/ActiveApplicationsService";

// Editable only for CASE_OWNER_ASSIGNER_ROLES; the server enforces the same
// rule (and who may be picked), this only hides the pencil for others.
function CaseOwnerRow({ application, onApplicationChange }) {
  const canAssign = useCanAssignCaseOwner();
  const displayValue = application.caseOwner || "Unassigned";

  if (!canAssign) {
    return <InfoRow label="Case Owner" value={displayValue} />;
  }

  return (
    <EditableInfoRow
      label="Case Owner"
      displayValue={displayValue}
      getEditValue={() =>
        application.caseOwnerId ? { id: application.caseOwnerId, name: application.caseOwner } : null
      }
      renderEditor={(value, setValue, saving) => (
        <UserPicker
          label="Case Owner"
          value={value}
          onChange={setValue}
          loadUsers={getAssignableUsers}
          disabled={saving}
        />
      )}
      onSave={async (value) => {
        const caseOwner = await assignCaseOwner(application.id, value?.id ?? null);

        onApplicationChange({
          caseOwnerId: caseOwner?.id ?? null,
          caseOwner: caseOwner?.name ?? "",
        });
      }}
    />
  );
}

function OverviewTab({ application, onApplicationChange }) {
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

          <CaseOwnerRow application={application} onApplicationChange={onApplicationChange} />

          <InfoRow
            label="Assigned Volunteer"
            value={application.assignedVolunteer}
          />

          <InfoRow label="Case Health" value={application.caseHealth} />

          <InfoRow
            label={application.linkedCats.length > 1 ? "Linked Cats" : "Linked Cat"}
            value={<LinkedCatChips cats={application.linkedCats} clickable emptyText="Not matched yet" />}
          />
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
