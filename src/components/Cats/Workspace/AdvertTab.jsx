import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import SectionCard from "../../Common/SectionCard";
import useDateFormat from "../../../hooks/useDateFormat";
import useAuth from "../../../hooks/useAuth";
import { approveAdvertDraft, getAdvertDraft, regenerateAdvertDraft, saveAdvertDraftEdit } from "../../../services/AdvertDraftService";

// The AI's draft advert for the cat: made when the cat was added, and again
// each time someone asks for a new one. Staff can edit it. An Admin approves
// it, which locks it: it can no longer be edited or replaced. Publishing is a
// separate step that is not built yet.
function AdvertTab({ cat }) {
  const { formatDateTime } = useDateFormat();
  const { isAdmin } = useAuth();
  const [confirmingApproval, setConfirmingApproval] = useState(false);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    let cancelled = false;

    getAdvertDraft(cat.id)
      .then((data) => !cancelled && setState(data))
      .catch((err) => {
        console.error("Failed to load the draft advert:", err);

        if (!cancelled) setError(err?.message || "Failed to load the draft advert.");
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [cat.id]);

  function startEditing() {
    setText(state.draft?.body ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    setWorking(true);
    setError(null);

    try {
      setState(await saveAdvertDraftEdit(cat.id, text));
      setEditing(false);
    } catch (err) {
      console.error("Failed to save the advert:", err);
      setError(err?.message || "Failed to save the advert.");

      // The advert may have been approved by someone else meanwhile.
      getAdvertDraft(cat.id)
        .then(setState)
        .catch(() => {});
    } finally {
      setWorking(false);
    }
  }

  async function handleApprove() {
    setWorking(true);
    setError(null);

    try {
      setState(await approveAdvertDraft(cat.id));
      setConfirmingApproval(false);
    } catch (err) {
      console.error("Failed to approve the advert:", err);
      setError(err?.message || "Failed to approve the advert.");
      setConfirmingApproval(false);

      getAdvertDraft(cat.id)
        .then(setState)
        .catch(() => {});
    } finally {
      setWorking(false);
    }
  }

  async function handleRegenerate() {
    setWorking(true);
    setError(null);

    try {
      setState(await regenerateAdvertDraft(cat.id));
    } catch (err) {
      console.error("Failed to make a new draft advert:", err);
      setError(err?.message || "Failed to make a new draft advert.");

      // A failed attempt is kept on the server, so show it as the latest.
      getAdvertDraft(cat.id)
        .then(setState)
        .catch(() => {});
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: "center", py: 4 }}>
        <CircularProgress size={28} sx={{ color: "text.secondary" }} />
      </Stack>
    );
  }

  if (!state) return <Alert severity="error">{error}</Alert>;

  const draft = state.draft;
  const failed = draft?.status === "failed";
  const edited = draft?.reason === "edit";
  const locked = draft?.status === "approved";
  const isEditing = editing && !locked;

  return (
    <SectionCard title={locked ? "Advert" : "Draft advert"}>
      <Stack spacing={2}>
        {!state.enabled && !locked && (
          <Alert severity="info">Draft adverts are not switched on on this server, so no new draft is made.</Alert>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!draft && <Typography color="text.secondary">No draft advert has been made for this cat yet.</Typography>}

        {failed && <Alert severity="warning">{`The last attempt failed: ${draft.error}`}</Alert>}

        {isEditing && (
          <TextField
            multiline
            minRows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={working}
            autoFocus
            sx={{ maxWidth: 720 }}
            slotProps={{ htmlInput: { maxLength: 5000 } }}
          />
        )}

        {locked && (
          <>
            <Typography sx={{ whiteSpace: "pre-wrap", maxWidth: 720 }}>{draft.body}</Typography>

            <Typography variant="body2" color="text.secondary">
              {`Approved by ${draft.createdBy?.name ?? "an Admin"} ${formatDateTime(new Date(draft.createdAt))}. This advert is locked and cannot be edited.`}
            </Typography>
          </>
        )}

        {!isEditing && draft?.status === "draft" && (
          <>
            <Typography sx={{ whiteSpace: "pre-wrap", maxWidth: 720 }}>{draft.body}</Typography>

            <Typography variant="body2" color="text.secondary">
              {edited
                ? `Edited by ${draft.createdBy?.name ?? "a team member"} ${formatDateTime(new Date(draft.createdAt))}. This is a draft: it is not published.`
                : `Written by the AI ${formatDateTime(new Date(draft.createdAt))}${draft.createdBy ? `, asked for by ${draft.createdBy.name}` : ", when the cat was added"}. This is a draft: it is not published.`}
            </Typography>
          </>
        )}

        {!locked && (
        <Stack direction="row" spacing={1}>
          {isEditing ? (
            <>
              <Button variant="contained" size="small" onClick={handleSave} disabled={working || !text.trim()}>
                {working ? "Saving..." : "Save"}
              </Button>
              <Button size="small" onClick={() => setEditing(false)} disabled={working}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outlined" size="small" onClick={startEditing} disabled={working}>
                {draft?.status === "draft" ? "Edit" : "Write it yourself"}
              </Button>
              <Button variant="outlined" size="small" onClick={handleRegenerate} disabled={working || !state.enabled}>
                {working ? "Writing..." : draft ? "Write a new draft" : "Write a draft"}
              </Button>
              {isAdmin && draft?.status === "draft" && (
                <Button variant="contained" size="small" onClick={() => setConfirmingApproval(true)} disabled={working}>
                  Approve
                </Button>
              )}
            </>
          )}
        </Stack>
        )}
      </Stack>

      <Dialog open={confirmingApproval} onClose={() => !working && setConfirmingApproval(false)}>
        <DialogTitle>Approve this advert?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Once approved, the advert is locked. It cannot be edited or replaced, and nobody can unlock it in Oriel.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmingApproval(false)} disabled={working}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleApprove} disabled={working}>
            {working ? "Approving..." : "Approve and lock"}
          </Button>
        </DialogActions>
      </Dialog>
    </SectionCard>
  );
}

export default AdvertTab;
