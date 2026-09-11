import { useState } from "react";
import {
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";

import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import { updateAdoptionField } from "../../services/ActiveApplicationsService";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../../constants/statuses/activeApplicationsStatuses";

const { ADOPTION_STAGE } = ACTIVE_APPLICATIONS_STATUS_OPTIONS;

function DecisionActions({ applicationId, applicationName, onDecision }) {
  const [confirmStage, setConfirmStage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function confirmDecision() {
    setSaving(true);

    try {
      await updateAdoptionField(applicationId, "adoptionStage", confirmStage);
      onDecision?.(confirmStage);
    } finally {
      setSaving(false);
      setConfirmStage(null);
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          color="success"
          startIcon={<CheckCircleIcon />}
          onClick={() => setConfirmStage(ADOPTION_STAGE.APPROVED_APPLICATION)}
        >
          Approve
        </Button>

        <Button
          variant="outlined"
          color="error"
          startIcon={<CancelIcon />}
          onClick={() => setConfirmStage(ADOPTION_STAGE.REJECTED_APPLICATION)}
        >
          Reject
        </Button>
      </Stack>

      <Dialog
        open={Boolean(confirmStage)}
        onClose={() => (!saving ? setConfirmStage(null) : null)}
      >
        <DialogTitle>
          {confirmStage === ADOPTION_STAGE.APPROVED_APPLICATION
            ? "Approve this application?"
            : "Reject this application?"}
        </DialogTitle>

        <DialogContent>
          <DialogContentText>
            {applicationName} will be marked as "{confirmStage}".
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmStage(null)} disabled={saving}>
            Cancel
          </Button>

          <Button variant="contained" onClick={confirmDecision} disabled={saving}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default DecisionActions;
