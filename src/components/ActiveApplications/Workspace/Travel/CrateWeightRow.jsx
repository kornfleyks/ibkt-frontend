import { MenuItem, TextField, Typography } from "@mui/material";
import EditableInfoRow from "../../../Common/EditableInfoRow";
import InfoRow from "../../../Common/InfoRow";
import { TRAVEL_STATUS_OPTIONS } from "../../../../constants/statuses/travelStatuses";

const UNITS = Object.values(TRAVEL_STATUS_OPTIONS.WEIGHT_UNIT);
const DEFAULT_UNIT = TRAVEL_STATUS_OPTIONS.WEIGHT_UNIT.KG;
const LABEL_WIDTH = 190;

// The crate weight: a free number with a kg / lb choice next to it. Saved
// together ({ crateWeight, weightUnit }); emptying the number clears the
// weight, and the server then clears the unit too.
function CrateWeightRow({ weight, unit, onSave }) {
  const hasWeight = weight !== "" && weight !== null && weight !== undefined;

  return (
    <EditableInfoRow
      label="Crate weight"
      renderDisplay={() => (
        <InfoRow
          label="Crate weight"
          labelWidth={LABEL_WIDTH}
          value={hasWeight ? `${Number(weight)} ${unit || DEFAULT_UNIT}` : <Typography color="text.secondary">Not set</Typography>}
        />
      )}
      getEditValue={() => ({ weight: hasWeight ? String(Number(weight)) : "", unit: unit || DEFAULT_UNIT })}
      renderEditor={(draft, setDraft, saving) => (
        <>
          <TextField
            size="small"
            type="number"
            value={draft.weight}
            onChange={(event) => setDraft({ ...draft, weight: event.target.value })}
            disabled={saving}
            slotProps={{ htmlInput: { min: 0, step: "any", "aria-label": "Crate weight" } }}
            helperText="Leave empty to clear."
            sx={{ flex: 1, minWidth: 90 }}
          />
          <TextField
            select
            size="small"
            value={draft.unit}
            onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
            disabled={saving}
            slotProps={{ htmlInput: { "aria-label": "Weight unit" } }}
            sx={{ ml: 1, minWidth: 80 }}
          >
            {UNITS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </>
      )}
      onSave={(draft) => {
        const typed = draft.weight.trim();

        if (typed === (hasWeight ? String(Number(weight)) : "") && draft.unit === (unit || DEFAULT_UNIT)) return Promise.resolve();

        return onSave(typed === "" ? { crateWeight: null } : { crateWeight: Number(typed), weightUnit: draft.unit });
      }}
    />
  );
}

export default CrateWeightRow;
