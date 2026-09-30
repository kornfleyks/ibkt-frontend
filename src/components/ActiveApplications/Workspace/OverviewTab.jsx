import { useCallback } from "react";
import { Grid } from "@mui/material";

import InfoRow from "../../Common/InfoRow";
import EditableInfoRow from "../../Common/EditableInfoRow";
import SectionCard from "../../Common/SectionCard";
import LinkedCatChips from "../../Common/LinkedCatChips";
import UserPicker from "../../Common/UserPicker";
import AiReviewCard from "./AiReview/AiReviewCard";
import useCanAssignCaseOwner from "../../../hooks/useCanAssignCaseOwner";
import {
  assignCaseOwner,
  assignVolunteer,
  getAssignableUsers,
  getVolunteerOptions,
} from "../../../services/ActiveApplicationsService";

// One label width for all three cards (fits "Previous Cat Experience"), so
// every value starts at the same place.
const LABEL_WIDTH = 210;

// Editable only for CASE_OWNER_ASSIGNER_ROLES; the server enforces the same
// rule (and who may be picked), this only hides the pencil for others.
function CaseOwnerRow({ application, onApplicationChange }) {
  const canAssign = useCanAssignCaseOwner();
  const displayValue = application.caseOwner || "Unassigned";

  if (!canAssign) {
    return <InfoRow labelWidth={LABEL_WIDTH} label="Case Owner" value={displayValue} />;
  }

  return (
    <EditableInfoRow
      label="Case Owner"
      labelWidth={LABEL_WIDTH}
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

// Anyone who can open the application page (Admins and its Case Owner) may
// change it; the server enforces that and that only an Active Volunteer
// can be picked.
function AssignedVolunteerRow({ application, onApplicationChange }) {
  const loadVolunteers = useCallback(() => getVolunteerOptions(application.id), [application.id]);

  return (
    <EditableInfoRow
      label="Assigned Volunteer"
      labelWidth={LABEL_WIDTH}
      displayValue={application.assignedVolunteer || "Unassigned"}
      getEditValue={() =>
        application.assignedVolunteerId ? { id: application.assignedVolunteerId, name: application.assignedVolunteer } : null
      }
      renderEditor={(value, setValue, saving) => (
        <UserPicker label="Assigned Volunteer" value={value} onChange={setValue} loadUsers={loadVolunteers} disabled={saving} />
      )}
      onSave={async (value) => {
        const volunteer = await assignVolunteer(application.id, value?.id ?? null);

        onApplicationChange({
          assignedVolunteerId: volunteer?.id ?? null,
          assignedVolunteer: volunteer?.name ?? "",
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
        <SectionCard title="Applicant Information" sx={{ height: "100%" }}>
          <InfoRow labelWidth={LABEL_WIDTH} label="Name" value={application.name} />

          <InfoRow labelWidth={LABEL_WIDTH} label="Email" value={application.email} />

          <InfoRow labelWidth={LABEL_WIDTH} label="Phone" value={application.phone} />

          <InfoRow labelWidth={LABEL_WIDTH} label="Country" value={application.country} />

          <InfoRow labelWidth={LABEL_WIDTH} label="City" value={application.city} />
        </SectionCard>
      </Grid>

      <Grid
        size={{
          xs: 12,
          md: 6,
        }}
      >
        <SectionCard title="Case Information" sx={{ height: "100%" }}>
          <InfoRow labelWidth={LABEL_WIDTH} label="Adoption Stage" value={application.adoptionStage} />

          <InfoRow labelWidth={LABEL_WIDTH} label="Priority" value={application.priority} />

          <CaseOwnerRow application={application} onApplicationChange={onApplicationChange} />

          <AssignedVolunteerRow application={application} onApplicationChange={onApplicationChange} />

          <InfoRow labelWidth={LABEL_WIDTH} label="Case Health" value={application.caseHealth} />

          <InfoRow
            labelWidth={LABEL_WIDTH}
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
          <InfoRow labelWidth={LABEL_WIDTH} label="Why Adopt" value={application.whyAdopt} />

          <InfoRow
            labelWidth={LABEL_WIDTH}
            label="Adoption Motivation"
            value={application.adoptionMotivation}
          />

          <InfoRow
            labelWidth={LABEL_WIDTH}
            label="Previous Cat Experience"
            value={application.previousCatExperience}
          />

          <InfoRow labelWidth={LABEL_WIDTH} label="Household" value={application.householdInformation} />

          <InfoRow labelWidth={LABEL_WIDTH} label="Existing Pets" value={application.existingPets} />

          <InfoRow labelWidth={LABEL_WIDTH} label="Work Schedule" value={application.workSchedule} />
        </SectionCard>
      </Grid>

      <Grid
        size={{
          xs: 12,
        }}
      >
        <AiReviewCard application={application} onApplicationChange={onApplicationChange} />
      </Grid>
    </Grid>
  );
}

export default OverviewTab;
