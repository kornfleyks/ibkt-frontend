import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { OpenInNewIcon } from "../icons";
import BondedGroupOption from "./BondedGroupOption";
import {
  matchApplicationToGroup,
  MatchConflictError,
  MatchConfigError,
} from "../../services/MatchingService";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../../constants/statuses/activeApplicationsStatuses";

const CONFIDENCE_OPTIONS = Object.values(ACTIVE_APPLICATIONS_STATUS_OPTIONS.MATCH_CONFIDENCE);

// The free-text application fields most relevant to picking a cat - there
// are no structured preference columns on the board.
const APPLICATION_FIELDS = [
  { key: "householdInformation", label: "Household" },
  { key: "existingPets", label: "Existing pets" },
  { key: "workSchedule", label: "Work schedule" },
  { key: "previousCatExperience", label: "Cat experience" },
  { key: "aiConcerns", label: "AI concerns" },
];

function ApplicationSummary({ application }) {
  const fields = APPLICATION_FIELDS.filter((field) => application[field.key]);

  return (
    <Stack spacing={1.5}>
      <Button
        component={RouterLink}
        to={`/active-applications/${application.id}`}
        target="_blank"
        size="small"
        endIcon={<OpenInNewIcon />}
        sx={{ alignSelf: "flex-start" }}
      >
        Open application
      </Button>

      {fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No household or pet details on this application yet.
        </Typography>
      ) : (
        fields.map((field) => (
          <Box key={field.key}>
            <Typography variant="subtitle2" color="text.secondary">
              {field.label}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
              {application[field.key]}
            </Typography>
          </Box>
        ))
      )}
    </Stack>
  );
}

// `open` is driven by `application` being set; the parent passes a `key`
// per application so selection/search state resets between opens.
function MatchDialog({ application, groups, onClose, onMatched }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [search, setSearch] = useState("");
  const [matchConfidence, setMatchConfidence] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hadConflict, setHadConflict] = useState(false);

  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return groups;
    }

    return groups.filter((group) => group.cats.some((cat) => cat.name.toLowerCase().includes(term)));
  }, [groups, search]);

  const selectedGroup = groups.find((group) => group.key === selectedKey) ?? null;

  function handleClose() {
    if (!saving) {
      onClose({ hadConflict });
    }
  }

  async function handleMatch() {
    setSaving(true);
    setError(null);

    try {
      const result = await matchApplicationToGroup({
        applicationId: application.id,
        catIds: selectedGroup.cats.map((cat) => cat.id),
        matchConfidence,
      });

      onMatched({ application, group: selectedGroup, failed: result.failed });
    } catch (err) {
      console.error("Failed to match application:", err);

      setHadConflict(err instanceof MatchConflictError);
      setError(
        err instanceof MatchConflictError
          ? `${err.message} Close this dialog to refresh the list.`
          : err instanceof MatchConfigError
            ? err.message
            : "Something went wrong while saving the match. Nothing was changed - please try again.",
      );
      setSaving(false);
    }
  }

  const catNames = selectedGroup?.cats.map((cat) => cat.name).join(" & ");

  return (
    <Dialog open onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Match {application.name}</DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <ApplicationSummary application={application} />
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={2}>
              <TextField
                size="small"
                label="Search cats"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                disabled={saving}
              />

              {groups.length === 0 ? (
                <Typography color="text.secondary">
                  No cats are available to match. A cat needs the "Adoption Ready" status and no linked
                  adopter, and every cat in a bonded group must qualify.
                </Typography>
              ) : visibleGroups.length === 0 ? (
                <Typography color="text.secondary">No cats match "{search}".</Typography>
              ) : (
                <Stack spacing={1.5} sx={{ maxHeight: { md: 480 }, overflowY: "auto", pr: 0.5 }}>
                  {visibleGroups.map((group) => (
                    <BondedGroupOption
                      key={group.key}
                      group={group}
                      selected={group.key === selectedKey}
                      onSelect={() => !saving && setSelectedKey(group.key)}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ gap: 1, flexWrap: "wrap" }}>
        <TextField
          select
          required
          size="small"
          label="Match Confidence"
          value={matchConfidence}
          onChange={(event) => setMatchConfidence(event.target.value)}
          disabled={saving}
          helperText={selectedGroup && !matchConfidence ? "Required to match" : " "}
          sx={{ minWidth: 180, mr: "auto" }}
        >
          {CONFIDENCE_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>

        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>

        <Button variant="contained" onClick={handleMatch} disabled={!selectedGroup || !matchConfidence || saving}>
          {saving ? "Matching..." : selectedGroup ? `Match with ${catNames}` : "Match"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MatchDialog;
