import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";

// "Delete file?" for one file of a list. `consequence`: what the text adds
// after "will be permanently removed" (e.g. "from this application's
// contracts. Contract statuses stay as they are.").
function ConfirmDeleteFileDialog({ file, consequence, deleting, onCancel, onConfirm }) {
  return (
    <Dialog open={Boolean(file)} onClose={() => (deleting ? null : onCancel())}>
      <DialogTitle sx={{ fontSize: "1.1rem" }}>Delete file?</DialogTitle>

      <DialogContent>{`"${file?.name}" will be permanently removed ${consequence} This can't be undone.`}</DialogContent>

      <DialogActions>
        <Button size="small" onClick={onCancel} disabled={deleting}>
          Cancel
        </Button>

        <Button size="small" variant="contained" color="error" onClick={onConfirm} disabled={deleting}>
          {deleting ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmDeleteFileDialog;
