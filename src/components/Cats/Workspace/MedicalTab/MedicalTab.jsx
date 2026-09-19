import { useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Stack,
  Button,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import EditIcon from "@mui/icons-material/EditOutlined";
import CheckIcon from "@mui/icons-material/CheckOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import BooleanStatus from "../../../Common/BooleanStatus";
import SectionCard from "../../../Common/SectionCard";
import EditableInfoRow from "../../../Common/EditableInfoRow";
import {
  updateCatVaccinated,
  updateCatNeutered,
  updateCatMedicationRequired,
  updateCatPassportComplete,
  uploadCatPassportFile,
  updateCatMicrochipNumber,
  updateCatFelvFivStatus,
  getCat,
} from "../../../../services/CatsService";
import { CATS_STATUS_OPTIONS } from "../../../../constants/statuses/catsStatuses";

const VACCINATED_OPTIONS = Object.values(CATS_STATUS_OPTIONS.VACCINATED);
const NEUTERED_OPTIONS = Object.values(CATS_STATUS_OPTIONS.NEUTERED);
const MEDICATION_REQUIRED_OPTIONS = Object.values(CATS_STATUS_OPTIONS.MEDICATION_REQUIRED);
const FELV_FIV_OPTIONS = Object.values(CATS_STATUS_OPTIONS.FELV_FIV_STATUS);
const YES_NO_OPTIONS = ["Yes", "No"];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// Vaccinated/Neutered are 3-value (Planned/Yes/No), so they can't be shown
// with the plain Yes/No BooleanStatus - Planned falls back to its own label.
function TriStateDisplay({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ flex: 1 }}>
      <Typography sx={{ width: 150 }}>{label}</Typography>

      {value === "Yes" || value === "No" ? (
        <BooleanStatus value={value === "Yes"} />
      ) : (
        <Typography sx={{ color: "text.secondary", fontWeight: 600 }}>{value}</Typography>
      )}
    </Stack>
  );
}

function BooleanDisplay({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ flex: 1 }}>
      <Typography sx={{ width: 150 }}>{label}</Typography>
      <BooleanStatus value={value} />
    </Stack>
  );
}

// Passport can't reuse the generic EditableInfoRow: marking it "Yes" without
// an existing passport file on record requires picking a file in the same
// step, and Save has to stay disabled until that file is chosen.
function PassportRow({ cat, onCatUpdate }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("No");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setStatus(cat.passportComplete ? "Yes" : "No");
    setFile(null);
    setError(null);
    setEditing(true);
  }

  function handleFileChange(event) {
    const selected = event.target.files?.[0] ?? null;

    if (selected && selected.size > MAX_FILE_SIZE_BYTES) {
      setError(`"${selected.name}" is larger than 20MB.`);
      return;
    }

    setError(null);
    setFile(selected);
  }

  const needsUpload = status === "Yes" && cat.passportFile.length === 0;
  const canSave = !needsUpload || file;

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      if (file) {
        await uploadCatPassportFile(cat.id, file);
      }

      await updateCatPassportComplete(cat.id, status === "Yes");

      onCatUpdate(await getCat(cat.id));

      setEditing(false);
    } catch (err) {
      console.error("Failed to update passport:", err);
      setError("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          "&:hover .row-edit-button, &:focus-within .row-edit-button": {
            opacity: 1,
          },
        }}
      >
        <BooleanDisplay label="Passport" value={cat.passportComplete} />

        <IconButton
          size="small"
          onClick={startEditing}
          aria-label="Edit Passport"
          className="row-edit-button"
          sx={{ opacity: 0, transition: "opacity 0.15s" }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Stack>
    );
  }

  return (
    <Stack spacing={1} sx={{ py: 0.5 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography sx={{ width: 120, fontWeight: 600, color: "text.secondary" }}>
          Passport
        </Typography>

        <TextField
          select
          size="small"
          sx={{ flex: 1 }}
          disabled={saving}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {YES_NO_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>

        <IconButton size="small" onClick={handleSave} disabled={saving || !canSave} aria-label="Save Passport">
          {saving ? <CircularProgress size={16} sx={{ color: "text.secondary" }} /> : <CheckIcon fontSize="small" />}
        </IconButton>

        <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      {needsUpload && (
        <Stack sx={{ pl: '132px' }}>
          <Button component="label" variant="outlined" size="small" disabled={saving} sx={{ alignSelf: "flex-start" }}>
            {file ? file.name : "Upload Passport File"}
            <input type="file" hidden onChange={handleFileChange} />
          </Button>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            A passport file is required before marking this as Yes.
          </Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ fontSize: "0.8125rem" }}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}

function SelectEditor(options) {
  return (value, setValue, saving) => (
    <TextField
      select
      size="small"
      sx={{ flex: 1 }}
      disabled={saving}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    >
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  );
}

function MedicalTab({ cat, onCatUpdate }) {
  return (
    <Grid container spacing={3}>
      <Grid
        size={{
          xs: 12,

          md: 6,
        }}
      >
        <SectionCard title="Medical Status">
          <Stack spacing={2}>
            <EditableInfoRow
              label="Vaccinated"
              getEditValue={() => cat.vaccinated}
              renderDisplay={() => <TriStateDisplay label="Vaccinated" value={cat.vaccinated} />}
              renderEditor={SelectEditor(VACCINATED_OPTIONS)}
              onSave={async (value) => {
                await updateCatVaccinated(cat.id, value);
                onCatUpdate({ vaccinated: value });
              }}
            />

            <EditableInfoRow
              label="Sterilized"
              getEditValue={() => cat.sterilized}
              renderDisplay={() => <TriStateDisplay label="Sterilized" value={cat.sterilized} />}
              renderEditor={SelectEditor(NEUTERED_OPTIONS)}
              onSave={async (value) => {
                await updateCatNeutered(cat.id, value);
                onCatUpdate({ sterilized: value });
              }}
            />

            <PassportRow cat={cat} onCatUpdate={onCatUpdate} />

            <EditableInfoRow
              label="Medication Required"
              getEditValue={() => (cat.medicationRequired ? "Yes" : "No")}
              renderDisplay={() => (
                <BooleanDisplay label="Medication Required" value={cat.medicationRequired} />
              )}
              renderEditor={SelectEditor(MEDICATION_REQUIRED_OPTIONS)}
              onSave={async (value) => {
                await updateCatMedicationRequired(cat.id, value);
                onCatUpdate({ medicationRequired: value === "Yes" });
              }}
            />
          </Stack>
        </SectionCard>
      </Grid>

      <Grid
        size={{
          xs: 12,

          md: 6,
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Additional Information
            </Typography>

            <EditableInfoRow
              label="Microchip"
              displayValue={cat.microchipNumber}
              getEditValue={() => (cat.microchipNumber === "N/A" ? "" : cat.microchipNumber)}
              renderEditor={(value, setValue, saving) => (
                <TextField
                  size="small"
                  sx={{ flex: 1 }}
                  disabled={saving}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              )}
              onSave={async (value) => {
                await updateCatMicrochipNumber(cat.id, value);
                onCatUpdate({ microchipNumber: value });
              }}
            />

            <EditableInfoRow
              label="FIV / FeLV"
              displayValue={cat.felvFivStatus}
              getEditValue={() => cat.felvFivStatus}
              renderEditor={SelectEditor(FELV_FIV_OPTIONS)}
              onSave={async (value) => {
                await updateCatFelvFivStatus(cat.id, value);
                onCatUpdate({ felvFivStatus: value });
              }}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default MedicalTab;
