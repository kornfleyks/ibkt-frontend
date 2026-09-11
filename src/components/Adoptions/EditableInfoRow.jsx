import { Box, Typography, TextField, MenuItem } from "@mui/material";

function EditableInfoRow({
  label,
  value,
  editing = false,
  fieldType = "text",
  options = [],
  onChange,
}) {
  if (!editing) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", py: 0.5 }}>
        <Typography
          sx={{ width: 160, fontWeight: 600, color: "text.secondary" }}
        >
          {label}
        </Typography>

        <Typography>{value || "—"}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", py: 0.5, gap: 2 }}>
      <Typography
        sx={{ width: 160, fontWeight: 600, color: "text.secondary", pt: 1 }}
      >
        {label}
      </Typography>

      {fieldType === "status" ? (
        <TextField
          select
          size="small"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          sx={{ flex: 1, maxWidth: 320 }}
        >
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      ) : (
        <TextField
          size="small"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          multiline={fieldType === "long_text"}
          minRows={fieldType === "long_text" ? 3 : 1}
          fullWidth
          sx={{ flex: 1 }}
        />
      )}
    </Box>
  );
}

export default EditableInfoRow;
