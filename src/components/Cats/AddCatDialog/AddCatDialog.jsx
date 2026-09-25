import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Alert,
  Tabs,
  Tab,
  Box,
  Stack,
} from "@mui/material";
import { CloseIcon, AddIcon } from "../../icons";

import CatFormFields from "./CatFormFields";
import {
  createCat,
  getCatDropdownOptions,
  linkBondedCats,
} from "../../../services/CatsService";
import { getRescuers } from "../../../services/RescuersService";
import { getMaxBondedCats } from "../../../services/AppSettingsService";

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

function emptyCatEntry() {
  return { form: { ...initialForm }, files: {} };
}

function AddCatDialog({ open, onClose, onCreated }) {
  const [cats, setCats] = useState([emptyCatEntry()]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [breedOptions, setBreedOptions] = useState([]);
  const [colourOptions, setColourOptions] = useState([]);
  const [rescuers, setRescuers] = useState([]);
  const [maxBondedCats, setMaxBondedCats] = useState(null);
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

    // getMaxBondedCats already falls back to a sane default internally on
    // failure, so no .catch/loadError handling is needed here.
    getMaxBondedCats().then(setMaxBondedCats);
  }, [open]);

  function setField(index, field, value) {
    setCats((current) =>
      current.map((entry, i) =>
        i === index ? { ...entry, form: { ...entry.form, [field]: value } } : entry,
      ),
    );
  }

  function setFile(index, field, fileList, acceptPrefix) {
    if (!fileList) {
      setCats((current) =>
        current.map((entry, i) =>
          i === index ? { ...entry, files: { ...entry.files, [field]: null } } : entry,
        ),
      );
      return;
    }

    const list = Array.from(fileList);
    const validationError = validateFiles(list, acceptPrefix);

    if (validationError) {
      setError(validationError);
      return;
    }

    setCats((current) =>
      current.map((entry, i) =>
        i === index ? { ...entry, files: { ...entry.files, [field]: list } } : entry,
      ),
    );
  }

  function addAnotherCat() {
    setCats((current) => [...current, emptyCatEntry()]);
    setActiveIndex(cats.length);
  }

  function removeCat(index) {
    setCats((current) => current.filter((_, i) => i !== index));
    setActiveIndex((current) => Math.max(0, current >= index ? current - 1 : current));
  }

  function handleClose() {
    if (saving) {
      return;
    }

    setCats([emptyCatEntry()]);
    setActiveIndex(0);
    setError(null);
    setLoadError(null);
    setPartialWarning(null);
    onClose();
  }

  async function handleSubmit() {
    const missingNameIndex = cats.findIndex((entry) => !entry.form.name.trim());

    if (missingNameIndex !== -1) {
      setActiveIndex(missingNameIndex);
      setError(
        cats.length > 1 ? `Cat ${missingNameIndex + 1} needs a name.` : "Name is required.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    setPartialWarning(null);

    try {
      const results = [];

      for (const entry of cats) {
        const { id, failedUploads } = await createCat(entry.form, entry.files);
        results.push({ id, name: entry.form.name, failedUploads });
      }

      if (results.length > 1) {
        await linkBondedCats(results.map((result) => result.id));
      }

      onCreated?.();

      const failedResults = results.filter((result) => result.failedUploads.length > 0);

      if (failedResults.length > 0) {
        // The cats were created - only some files failed. Keep the dialog
        // open so the user actually sees this instead of it flashing by.
        const details = failedResults
          .map(
            (result) =>
              `"${result.name}": ${result.failedUploads.map((field) => FILE_FIELD_LABELS[field]).join(", ")}`,
          )
          .join("; ");

        setPartialWarning(
          `${results.length > 1 ? "Cats were" : "Cat was"} added, but these files failed to upload - ${details}. You can add them later from each cat's Documents tab.`,
        );
        return;
      }

      handleClose();
    } catch (err) {
      console.error("Failed to create cat(s):", err);
      setError("Something went wrong while saving. Please try again.");
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

        {cats.length > 1 && (
          <Alert severity="info">
            Adding {cats.length} cats as a bonded group - each cat needs its own details, and
            they'll be linked together as "Bonded With" once created.
          </Alert>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tabs
            value={activeIndex}
            onChange={(event, newValue) => setActiveIndex(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ flex: 1, minHeight: 0 }}
          >
            {cats.map((entry, index) => (
              <Tab
                key={index}
                sx={{ minHeight: 0 }}
                label={
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <span>{entry.form.name || `Cat ${index + 1}`}</span>
                    {cats.length > 1 && (
                      <IconButton
                        size="small"
                        component="span"
                        aria-label={`Remove Cat ${index + 1}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeCat(index);
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Stack>
                }
              />
            ))}
          </Tabs>

          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={addAnotherCat}
            disabled={saving || (maxBondedCats != null && cats.length >= maxBondedCats)}
          >
            Add Another Cat
          </Button>
        </Box>

        {maxBondedCats != null && cats.length >= maxBondedCats && (
          <Alert severity="info">
            A bonded group can have at most {maxBondedCats} cats.
          </Alert>
        )}

        {cats.map((entry, index) => (
          <Box key={index} sx={{ display: index === activeIndex ? "block" : "none" }}>
            <Stack spacing={3}>
              <CatFormFields
                form={entry.form}
                setField={(field, value) => setField(index, field, value)}
                files={entry.files}
                setFile={(field, fileList, acceptPrefix) =>
                  setFile(index, field, fileList, acceptPrefix)
                }
                breedOptions={breedOptions}
                colourOptions={colourOptions}
                rescuers={rescuers}
              />
            </Stack>
          </Box>
        ))}

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
              {saving ? "Saving..." : cats.length > 1 ? `Add ${cats.length} Cats` : "Add Cat"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default AddCatDialog;
