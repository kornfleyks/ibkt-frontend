import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Grid, Button, Stack } from "@mui/material";

import PageHeader from "../../components/PageHeader";
import SectionCard from "../../components/Common/SectionCard";
import InfoRow from "../../components/Common/InfoRow";
import EditableInfoRow from "../../components/Adoptions/EditableInfoRow";

import {
  getAdoption,
  updateAdoptionField,
  ADOPTION_EDITABLE_FIELDS,
} from "../../services/ActiveApplicationsService";
import { useLoading } from "../../context/LoadingContext";
import { useAuth } from "../../context/AuthContext";

function AdoptionDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const canEdit = hasRole("SuperAdmin");

  const [adoption, setAdoption] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const { showLoading, hideLoading } = useLoading();

  async function loadAdoption() {
    showLoading("Loading adoption...");

    try {
      const data = await getAdoption(id);
      setAdoption(data);
    } finally {
      hideLoading();
    }
  }

  useEffect(() => {
    loadAdoption();
  }, [id]);

  if (!adoption) {
    return null;
  }

  function startEditing() {
    setDraft({
      caseOwner: adoption.caseOwner,
      assignedVolunteer: adoption.assignedVolunteer,
      priority: adoption.priority,
      adoptionStage: adoption.adoptionStage,
      caseHealth: adoption.caseHealth,
      teamDecision: adoption.teamDecision,
      decisionNotes: adoption.decisionNotes,
      internalNotes: adoption.internalNotes,
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setDraft({});
  }

  async function saveEditing() {
    setSaving(true);

    try {
      const changedFields = Object.keys(draft).filter(
        (field) => draft[field] !== adoption[field],
      );

      await Promise.all(
        changedFields.map((field) =>
          updateAdoptionField(id, field, draft[field]),
        ),
      );

      setAdoption((current) => ({ ...current, ...draft }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={adoption.name}
        subtitle={adoption.adoptionStage}
        actions={
          canEdit && (
            editing ? (
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={cancelEditing} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={saveEditing} disabled={saving}>
                  Save Changes
                </Button>
              </Stack>
            ) : (
              <Button variant="contained" onClick={startEditing}>
                Edit
              </Button>
            )
          )
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Applicant Information">
            <InfoRow label="Name" value={adoption.name} />
            <InfoRow label="Email" value={adoption.email} />
            <InfoRow label="Phone" value={adoption.phone} />
            <InfoRow label="Country" value={adoption.country} />
            <InfoRow label="City" value={adoption.city} />
            <InfoRow label="Address" value={adoption.address} />
            <InfoRow label="Application ID" value={adoption.applicationId} />
            <InfoRow label="Created" value={adoption.creationDate} />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Case Information">
            <EditableInfoRow
              label="Case Owner"
              value={editing ? draft.caseOwner : adoption.caseOwner}
              editing={editing}
              fieldType="text"
              onChange={(value) => setDraft((d) => ({ ...d, caseOwner: value }))}
            />
            <EditableInfoRow
              label="Assigned Volunteer"
              value={editing ? draft.assignedVolunteer : adoption.assignedVolunteer}
              editing={editing}
              fieldType="text"
              onChange={(value) =>
                setDraft((d) => ({ ...d, assignedVolunteer: value }))
              }
            />
            <EditableInfoRow
              label="Priority"
              value={editing ? draft.priority : adoption.priority}
              editing={editing}
              fieldType="status"
              options={ADOPTION_EDITABLE_FIELDS.priority.options}
              onChange={(value) => setDraft((d) => ({ ...d, priority: value }))}
            />
            <EditableInfoRow
              label="Adoption Stage"
              value={editing ? draft.adoptionStage : adoption.adoptionStage}
              editing={editing}
              fieldType="status"
              options={ADOPTION_EDITABLE_FIELDS.adoptionStage.options}
              onChange={(value) => setDraft((d) => ({ ...d, adoptionStage: value }))}
            />
            <EditableInfoRow
              label="Case Health"
              value={editing ? draft.caseHealth : adoption.caseHealth}
              editing={editing}
              fieldType="status"
              options={ADOPTION_EDITABLE_FIELDS.caseHealth.options}
              onChange={(value) => setDraft((d) => ({ ...d, caseHealth: value }))}
            />
            <InfoRow label="Linked Cat" value={adoption.linkedCatName} />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <SectionCard title="Application Details">
            <InfoRow label="Why Adopt" value={adoption.whyAdopt} />
            <InfoRow label="Adoption Motivation" value={adoption.adoptionMotivation} />
            <InfoRow
              label="Previous Cat Experience"
              value={adoption.previousCatExperience}
            />
            <InfoRow label="Household" value={adoption.householdInformation} />
            <InfoRow label="Existing Pets" value={adoption.existingPets} />
            <InfoRow label="Work Schedule" value={adoption.workSchedule} />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Calls">
            <InfoRow label="Call 1 Completed" value={adoption.call1Completed} />
            <InfoRow label="Call 1 Sentiment" value={adoption.call1Sentiment} />
            <InfoRow label="Call 1 Summary" value={adoption.call1Summary} />
            <InfoRow label="Call 2 Required" value={adoption.call2Required} />
            <InfoRow label="Call 2 Summary" value={adoption.call2Summary} />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Video">
            <InfoRow label="Video Submitted" value={adoption.videoSubmitted} />
            <InfoRow label="Video Approved" value={adoption.videoApproved} />
            <InfoRow label="Review Notes" value={adoption.videoReviewNotes} />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="References">
            <InfoRow label="Submitted" value={adoption.referencesSubmitted} />
            <InfoRow label="Referee 1" value={adoption.referee1} />
            <InfoRow label="Referee 2" value={adoption.referee2} />
            <InfoRow label="Outcome" value={adoption.referenceOutcome} />
            <InfoRow label="Notes" value={adoption.referenceNotes} />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Matching & Decision">
            <InfoRow label="Match Confidence" value={adoption.matchConfidence} />
            <EditableInfoRow
              label="Team Decision"
              value={editing ? draft.teamDecision : adoption.teamDecision}
              editing={editing}
              fieldType="status"
              options={ADOPTION_EDITABLE_FIELDS.teamDecision.options}
              onChange={(value) => setDraft((d) => ({ ...d, teamDecision: value }))}
            />
            <EditableInfoRow
              label="Decision Notes"
              value={editing ? draft.decisionNotes : adoption.decisionNotes}
              editing={editing}
              fieldType="long_text"
              onChange={(value) => setDraft((d) => ({ ...d, decisionNotes: value }))}
            />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Contract">
            <InfoRow label="Draft Generated" value={adoption.draftContractGenerated} />
            <InfoRow label="Final Sent" value={adoption.finalContractSent} />
            <InfoRow label="Signed Received" value={adoption.signedContractReceived} />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Payment">
            <InfoRow label="Required" value={adoption.paymentRequired} />
            <InfoRow label="Status" value={adoption.paymentStatus} />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <SectionCard title="AI Review">
            <InfoRow label="Recommendation" value={adoption.aiRecommendation} />
            <InfoRow label="Summary" value={adoption.aiSummary} />
            <InfoRow label="Concerns" value={adoption.aiConcerns} />
            <InfoRow label="Missing Information" value={adoption.aiMissingInformation} />
            <InfoRow label="Suggested Next Action" value={adoption.suggestedNextAction} />
            <InfoRow label="Suggested Questions" value={adoption.suggestedQuestions} />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <SectionCard title="Internal Notes">
            <EditableInfoRow
              label="Internal Notes"
              value={editing ? draft.internalNotes : adoption.internalNotes}
              editing={editing}
              fieldType="long_text"
              onChange={(value) => setDraft((d) => ({ ...d, internalNotes: value }))}
            />
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}

export default AdoptionDetail;
