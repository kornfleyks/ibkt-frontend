import { useState } from "react";
import { Alert, FormControlLabel, Grid, Stack, Switch, Typography } from "@mui/material";
import SectionCard from "../../../Common/SectionCard";
import RecordField from "../../../Common/RecordField";
import InfoRow from "../../../Common/InfoRow";
import { updateCatPassportDate, updateCatPassportComplete } from "../../../../services/CatsService";

const LABEL_WIDTH = 190;

// The Cat Passport dates and the passport status of one cat, in place of the
// separate Jotform form (docs/cat-passport.md). Each date is saved as soon as
// it is edited; an empty value clears it. The gender, breed, colour, sterilised,
// FeLV/FIV, medical and microchip details of the passport are the cat's own
// fields, shown elsewhere on the cat record.
function PassportSection({ cat, onCatUpdate }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileCount = cat.passportFile?.length ?? 0;

  function dateField(label, field) {
    return (
      <RecordField
        label={label}
        kind="date"
        value={cat[field]}
        onSave={async (date) => {
          await updateCatPassportDate(cat.id, field, date);
          onCatUpdate({ [field]: date ?? "" });
        }}
      />
    );
  }

  async function toggleComplete(checked) {
    setSaving(true);
    setError(null);

    try {
      await updateCatPassportComplete(cat.id, checked);
      onCatUpdate({ passportComplete: checked });
    } catch (err) {
      console.error("Failed to save the passport status:", err);
      setError(err?.message || "Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Cat Passport">
      <Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            {dateField("Date of birth", "dateOfBirth")}
            {dateField("Microchip implant date", "microchipImplantDate")}
            {dateField("Last dewormed", "lastDewormed")}
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            {dateField("First Tricat", "firstTricat")}
            {dateField("Booster Tricat", "boosterTricat")}
            {dateField("Rabies vaccination", "rabiesVaccination")}
          </Grid>
        </Grid>

        <InfoRow
          label="Passport file"
          labelWidth={LABEL_WIDTH}
          value={
            fileCount > 0 ? (
              `${fileCount} ${fileCount === 1 ? "file" : "files"} uploaded`
            ) : (
              <Typography color="text.secondary">Not uploaded yet. Upload the scanned passport on the Documents tab.</Typography>
            )
          }
        />

        <div>
          <FormControlLabel
            control={<Switch checked={Boolean(cat.passportComplete)} onChange={(event) => toggleComplete(event.target.checked)} disabled={saving} />}
            label="Passport marked complete"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            Switch this on when the dates above and the scanned passport are complete. A cat cannot be set to Adoption Ready until it is on.
          </Typography>
        </div>

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </SectionCard>
  );
}

export default PassportSection;
