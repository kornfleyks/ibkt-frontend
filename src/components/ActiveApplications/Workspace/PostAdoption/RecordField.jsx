import { MenuItem, TextField, Typography } from "@mui/material";
import EditableInfoRow from "../../../Common/EditableInfoRow";
import InfoRow from "../../../Common/InfoRow";
import useDateFormat from "../../../../hooks/useDateFormat";

const LABEL_WIDTH = 190;

// One editable field of the post-adoption record. `kind`: "select"
// (`options`), "date", "text" or "longText". `onSave(value)` saves it
// (the tab's save of { [field]: value }); an empty value clears the field.
// `renderValue` overrides how the saved value is shown.
function RecordField({ label, value, kind, options = [], onSave, renderValue }) {
  const { formatDateString } = useDateFormat();
  const empty = <Typography color="text.secondary">Not set</Typography>;

  function shown() {
    if (renderValue) return renderValue(value);
    if (!value) return empty;
    if (kind === "date") return formatDateString(value);

    if (kind === "longText") {
      return <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{value}</Typography>;
    }

    return value;
  }

  return (
    <EditableInfoRow
      label={label}
      renderDisplay={() => <InfoRow label={label} labelWidth={LABEL_WIDTH} value={shown()} />}
      getEditValue={() => value ?? ""}
      renderEditor={(draft, setDraft, saving) => {
        if (kind === "select") {
          return (
            <TextField select fullWidth size="small" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={saving}>
              <MenuItem value="">
                <em>Not set</em>
              </MenuItem>
              {options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          );
        }

        return (
          <TextField
            fullWidth
            size="small"
            type={kind === "date" ? "date" : "text"}
            multiline={kind === "longText"}
            minRows={kind === "longText" ? 3 : undefined}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={saving}
            sx={kind === "date" ? { "& input": { minWidth: 130 } } : undefined}
          />
        );
      }}
      onSave={(draft) => (draft === (value ?? "") ? Promise.resolve() : onSave(kind === "date" && !draft ? null : draft))}
    />
  );
}

export default RecordField;
