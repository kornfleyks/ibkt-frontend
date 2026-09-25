import { useState } from "react";
import {
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from "@mui/material";

import { updateAdoptionField } from "../../services/ActiveApplicationsService";

// Stage-transition buttons for an application. Each entry in `actions` is
// { stage, label, color, icon, confirmTitle }: clicking asks for
// confirmation, then writes `stage` to the application's Adoption Stage.
// `disabledReason`: when set, every button is disabled and the reason shows
// as a tooltip on hover (e.g. no cat linked yet).
function DecisionActions({ applicationId, applicationName, actions, onDecision, disabledReason = null }) {
  const [confirmAction, setConfirmAction] = useState(null);
  const [saving, setSaving] = useState(false);

  async function confirmDecision() {
    setSaving(true);

    try {
      await updateAdoptionField(applicationId, "adoptionStage", confirmAction.stage);
      onDecision?.(confirmAction.stage);
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1}>
        {/* Disabled buttons don't fire mouse events, so each sits in a span
            for the tooltip to attach to. No tooltip when enabled. */}
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Tooltip key={action.stage} title={disabledReason ?? ""} disableHoverListener={!disabledReason}>
              <span>
                <Button
                  variant="outlined"
                  color={action.color}
                  startIcon={Icon ? <Icon /> : null}
                  disabled={Boolean(disabledReason)}
                  onClick={() => setConfirmAction(action)}
                >
                  {action.label}
                </Button>
              </span>
            </Tooltip>
          );
        })}
      </Stack>

      <Dialog
        open={Boolean(confirmAction)}
        onClose={() => (!saving ? setConfirmAction(null) : null)}
      >
        <DialogTitle>{confirmAction?.confirmTitle}</DialogTitle>

        <DialogContent>
          <DialogContentText>
            {applicationName} will be marked as "{confirmAction?.stage}".
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmAction(null)} disabled={saving}>
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
