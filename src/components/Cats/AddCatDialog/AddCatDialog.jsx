import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Grid,
  TextField,
  MenuItem,
  Autocomplete,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import SectionCard from "../../Common/SectionCard";
import { CATS_STATUS_OPTIONS } from "../../../constants/statuses/catsStatuses";
import {
  createCat,
  getCatDropdownOptions,
} from "../../../services/CatsService";
import { getRescuers } from "../../../services/RescuersService";

const YES_NO = [
  CATS_STATUS_OPTIONS.MEDICATION_REQUIRED.YES,
  CATS_STATUS_OPTIONS.MEDICATION_REQUIRED.NO,
];

const YES_NO_SOMETIMES_UNKNOWN = [
  CATS_STATUS_OPTIONS.LAP_CAT.YES,
  CATS_STATUS_OPTIONS.LAP_CAT.NO,
  CATS_STATUS_OPTIONS.LAP_CAT.SOMETIMES,
  CATS_STATUS_OPTIONS.LAP_CAT.UNKNOWN,
];

const YES_NO_PLANNED = [
  CATS_STATUS_OPTIONS.VACCINATED.PLANNED,
  CATS_STATUS_OPTIONS.VACCINATED.YES,
  CATS_STATUS_OPTIONS.VACCINATED.NO,
];

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const FILE_FIELD_LABELS = {
  photos: "Photos",
  videos: "Videos",
  medicalDocuments: "Medical Documents",
  passportFile: "Passport File",
};

function validateFiles(fileList, acceptPrefix) {
  for (const file of fileList) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `"${file.name}" is larger than 20MB.`;
    }

    if (acceptPrefix && !file.type.startsWith(acceptPrefix)) {
      return `"${file.name}" doesn't look like a valid ${acceptPrefix.replace(/\/$/, "")} file.`;
    }
  }

  return null;
}

const initialForm = {
  name: "",
  gender: "",
  age: "",
  breed: "",
  colour: "",
  rescuerId: "",
  fosterContact: "",
  fosterLocation: "",
  personalitySummary: "",
  energyLevel: "",
  lapCat: "",
  childFriendly: "",
  catFriendly: "",
  dogFriendly: "",
  indoorOnly: "",
  specialNotes: "",
  medicalSummary: "",
  vaccinated: "",
  neutered: "",
  felvFivStatus: "",
  medicationRequired: "",
  microchipNumber: "",
};

function SelectField({ label, value, onChange, options }) {
  return (
    <TextField
      select
      fullWidth
      size="small"
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <MenuItem value="">—</MenuItem>
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  );
}

function AddCatDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState({});
  const [breedOptions, setBreedOptions] = useState([]);
  const [colourOptions, setColourOptions] = useState([]);
  const [rescuers, setRescuers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [partialWarning, setPartialWarning] = useState(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    // Fetched independently so one failing (e.g. Monday being briefly
    // unreachable) doesn't wipe out data the other successfully returned.
    getCatDropdownOptions()
      .then((options) => {
        setBreedOptions(options.breed);
        setColourOptions(options.colour);
      })
      .catch((err) => {
        console.error("Failed to load Breed/Colour options:", err);
        setLoadError((current) =>
          current ?? "Couldn't load Breed/Colour options from Monday - you can still type them in manually.",
        );
      });

    getRescuers()
      .then(setRescuers)
      .catch((err) => {
        console.error("Failed to load rescuers:", err);
        setLoadError((current) =>
          current ?? "Couldn't load the rescuer list from Monday - try reopening this dialog.",
        );
      });
  }, [open]);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setFile(field, fileList, acceptPrefix) {
    if (!fileList) {
      setFiles((current) => ({ ...current, [field]: null }));
      return;
    }

    const list = Array.from(fileList);
    const validationError = validateFiles(list, acceptPrefix);

    if (validationError) {
      setError(validationError);
      return;
    }

    setFiles((current) => ({ ...current, [field]: list }));
  }

  function handleClose() {
    if (saving) {
      return;
    }

    setForm(initialForm);
    setFiles({});
    setError(null);
    setLoadError(null);
    setPartialWarning(null);
    onClose();
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setPartialWarning(null);

    try {
      const { failedUploads } = await createCat(form, files);
      onCreated?.();

      if (failedUploads.length > 0) {
        // The cat was created - only some files failed. Keep the dialog
        // open so the user actually sees this instead of it flashing by.
        setPartialWarning(
          `Cat was added, but these files failed to upload: ${failedUploads
            .map((field) => FILE_FIELD_LABELS[field])
            .join(", ")}. You can add them later from the cat's Documents tab.`,
        );
        return;
      }

      handleClose();
    } catch (err) {
      console.error("Failed to create cat:", err);
      setError("Something went wrong while saving this cat. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: "1.1rem" }}>
        Add Cat
        <IconButton
          onClick={handleClose}
          disabled={saving}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ "& > * + *": { mt: 3 } }}>
        {loadError && <Alert severity="warning">{loadError}</Alert>}

        <SectionCard title="Core Identity">
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                size="small"
                label="Name"
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <SelectField
                label="Gender"
                value={form.gender}
                onChange={(value) => setField("gender", value)}
                options={Object.values(CATS_STATUS_OPTIONS.GENDER)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Age"
                value={form.age}
                onChange={(event) => setField("age", event.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                freeSolo
                size="small"
                options={breedOptions}
                value={form.breed}
                onInputChange={(event, value) => setField("breed", value)}
                renderInput={(params) => <TextField {...params} label="Breed" />}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                freeSolo
                size="small"
                options={colourOptions}
                value={form.colour}
                onInputChange={(event, value) => setField("colour", value)}
                renderInput={(params) => <TextField {...params} label="Colour" />}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard title="Rescuer / Foster">
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                size="small"
                options={rescuers}
                getOptionLabel={(option) => option.name ?? ""}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(event, value) => setField("rescuerId", value?.id ?? "")}
                renderInput={(params) => <TextField {...params} label="Linked Rescuer" />}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Foster Contact"
                value={form.fosterContact}
                onChange={(event) => setField("fosterContact", event.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Foster Location"
                value={form.fosterLocation}
                onChange={(event) => setField("fosterLocation", event.target.value)}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard title="Personality & Behaviour">
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Personality Summary"
                value={form.personalitySummary}
                onChange={(event) => setField("personalitySummary", event.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <SelectField
                label="Energy Level"
                value={form.energyLevel}
                onChange={(value) => setField("energyLevel", value)}
                options={Object.values(CATS_STATUS_OPTIONS.ENERGY_LEVEL)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <SelectField
                label="Lap Cat"
                value={form.lapCat}
                onChange={(value) => setField("lapCat", value)}
                options={YES_NO_SOMETIMES_UNKNOWN}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <SelectField
                label="Indoor Only"
                value={form.indoorOnly}
                onChange={(value) => setField("indoorOnly", value)}
                options={YES_NO}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <SelectField
                label="Child Friendly"
                value={form.childFriendly}
                onChange={(value) => setField("childFriendly", value)}
                options={YES_NO_SOMETIMES_UNKNOWN}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <SelectField
                label="Cat Friendly"
                value={form.catFriendly}
                onChange={(value) => setField("catFriendly", value)}
                options={YES_NO_SOMETIMES_UNKNOWN}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <SelectField
                label="Dog Friendly"
                value={form.dogFriendly}
                onChange={(value) => setField("dogFriendly", value)}
                options={YES_NO_SOMETIMES_UNKNOWN}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Special Notes"
                value={form.specialNotes}
                onChange={(event) => setField("specialNotes", event.target.value)}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard title="Medical">
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Medical Summary"
                value={form.medicalSummary}
                onChange={(event) => setField("medicalSummary", event.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <SelectField
                label="Vaccinated"
                value={form.vaccinated}
                onChange={(value) => setField("vaccinated", value)}
                options={YES_NO_PLANNED}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <SelectField
                label="Neutered"
                value={form.neutered}
                onChange={(value) => setField("neutered", value)}
                options={YES_NO_PLANNED}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <SelectField
                label="FeLV/FIV Status"
                value={form.felvFivStatus}
                onChange={(value) => setField("felvFivStatus", value)}
                options={Object.values(CATS_STATUS_OPTIONS.FELV_FIV_STATUS)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <SelectField
                label="Medication Required"
                value={form.medicationRequired}
                onChange={(value) => setField("medicationRequired", value)}
                options={YES_NO}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Microchip Number"
                value={form.microchipNumber}
                onChange={(event) => setField("microchipNumber", event.target.value)}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard title="Media & Documents">
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Button component="label" variant="outlined" size="small" fullWidth>
                {files.photos?.length ? `${files.photos.length} photo(s) selected` : "Upload Photos"}
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*"
                  onChange={(event) => setFile("photos", event.target.files, "image/")}
                />
              </Button>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Button component="label" variant="outlined" size="small" fullWidth>
                {files.videos?.length ? `${files.videos.length} video(s) selected` : "Upload Videos"}
                <input
                  type="file"
                  hidden
                  multiple
                  accept="video/*"
                  onChange={(event) => setFile("videos", event.target.files, "video/")}
                />
              </Button>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Button component="label" variant="outlined" size="small" fullWidth>
                {files.medicalDocuments?.length
                  ? `${files.medicalDocuments.length} file(s) selected`
                  : "Upload Medical Documents"}
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={(event) => setFile("medicalDocuments", event.target.files)}
                />
              </Button>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Button component="label" variant="outlined" size="small" fullWidth>
                {files.passportFile?.length ? "Passport file selected" : "Upload Passport File"}
                <input
                  type="file"
                  hidden
                  onChange={(event) => setFile("passportFile", event.target.files)}
                />
              </Button>
            </Grid>
          </Grid>
        </SectionCard>

        {partialWarning && <Alert severity="warning">{partialWarning}</Alert>}
        {error && <Alert severity="error" sx={{ fontSize: "0.8125rem" }}>{error}</Alert>}
      </DialogContent>

      <DialogActions>
        {partialWarning ? (
          <Button size="small" variant="contained" onClick={handleClose}>
            Close
          </Button>
        ) : (
          <>
            <Button size="small" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>

            <Button size="small" variant="contained" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : "Add Cat"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default AddCatDialog;
