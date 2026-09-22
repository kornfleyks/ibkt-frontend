import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Stack,
} from "@mui/material";
import BooleanStatus from "../../../Common/BooleanStatus";
import SectionCard from "../../../Common/SectionCard";
import EditableInfoRow from "../../../Common/EditableInfoRow";
import {
  updateCatVaccinated,
  updateCatNeutered,
  updateCatMedicationRequired,
  updateCatMicrochipNumber,
  updateCatFelvFivStatus,
} from "../../../../services/CatsService";
import { CATS_STATUS_OPTIONS } from "../../../../constants/statuses/catsStatuses";

const VACCINATED_OPTIONS = Object.values(CATS_STATUS_OPTIONS.VACCINATED);
const NEUTERED_OPTIONS = Object.values(CATS_STATUS_OPTIONS.NEUTERED);
const MEDICATION_REQUIRED_OPTIONS = Object.values(CATS_STATUS_OPTIONS.MEDICATION_REQUIRED);
const FELV_FIV_OPTIONS = Object.values(CATS_STATUS_OPTIONS.FELV_FIV_STATUS);

// Vaccinated/Neutered are 3-value (Planned/Yes/No), so they can't be shown
// with the plain Yes/No BooleanStatus - Planned falls back to its own label.
function TriStateDisplay({ label, value }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Typography sx={{ minWidth: 160, flexShrink: 0, whiteSpace: 'nowrap', fontWeight: 600, color: 'text.secondary' }}>
        {label}
      </Typography>

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
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Typography sx={{ minWidth: 160, flexShrink: 0, whiteSpace: 'nowrap', fontWeight: 600, color: 'text.secondary' }}>
        {label}
      </Typography>
      <BooleanStatus value={value} />
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

            <BooleanDisplay label="Passport" value={cat.passportFile.length > 0} />

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
