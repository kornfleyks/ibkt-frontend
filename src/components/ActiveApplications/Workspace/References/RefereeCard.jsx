import { useState } from "react";
import { Alert, Box, Button, Card, CardContent, IconButton, Link, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { EditIcon } from "../../../icons";
import { parseReferee, refereeText } from "./refereeText";

// One referee: name, phone (tap to call) and email (tap to email), with an
// edit form. `onSave(text)` saves the combined "Name, phone, email" line
// ("" clears the referee).
function RefereeCard({ title, value, onSave }) {
  const referee = parseReferee(value);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function startEditing() {
    setDraft(referee);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);

    try {
      await onSave(refereeText(draft));
      setDraft(null);
    } catch (err) {
      console.error(`Failed to save ${title}:`, err);
      setError(err?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const field = (key, label, type = "text") => (
    <TextField
      label={label}
      type={type}
      size="small"
      fullWidth
      value={draft[key]}
      onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
      disabled={saving}
    />
  );

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>

          {!draft && (
            <Tooltip title={`Edit ${title}`}>
              <IconButton size="small" onClick={startEditing} aria-label={`Edit ${title}`}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {draft ? (
          <Stack spacing={1.5}>
            {field("name", "Name")}
            {field("phone", "Phone", "tel")}
            {field("email", "Email", "email")}

            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
              <Button onClick={() => setDraft(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="contained" onClick={save} disabled={saving}>
                Save
              </Button>
            </Stack>
          </Stack>
        ) : value ? (
          <Stack spacing={0.5}>
            <Typography sx={{ overflowWrap: "anywhere" }}>{referee.name || "No name given"}</Typography>
            {referee.phone && (
              <Link href={`tel:${referee.phone.replace(/[^\d+]/g, "")}`} underline="hover" sx={{ width: "fit-content" }}>
                {referee.phone}
              </Link>
            )}
            {referee.email && (
              <Link href={`mailto:${referee.email}`} underline="hover" sx={{ width: "fit-content", overflowWrap: "anywhere" }}>
                {referee.email}
              </Link>
            )}
          </Stack>
        ) : (
          <Box>
            <Typography color="text.secondary">Not given</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default RefereeCard;
