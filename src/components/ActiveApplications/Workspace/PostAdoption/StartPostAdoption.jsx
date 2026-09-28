import { useState } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import SectionCard from "../../../Common/SectionCard";
import { startPostAdoption } from "../../../../services/PostAdoptionService";

// No post-adoption record yet: ask for the dates and create one, linked to
// the application and its cat, with the 9 check-ins scheduled (server).
function StartPostAdoption({ applicationId, onStarted }) {
  const [adoptionDate, setAdoptionDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  async function handleStart() {
    if (!adoptionDate) {
      setError("The adoption date is required.");
      return;
    }

    setStarting(true);
    setError(null);

    try {
      onStarted(await startPostAdoption(applicationId, { adoptionDate, arrivalDate: arrivalDate || null }));
    } catch (err) {
      console.error("Failed to start post-adoption:", err);
      setError(err?.message || "Something went wrong while starting the post-adoption.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <SectionCard title="Post-adoption">
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography color="text.secondary">
          This application has no post-adoption record yet. Starting one links it to the application and its cat and schedules the 9 check-ins
          (24 hours to 1 year) from the arrival date, or the adoption date if the cat hasn't arrived yet.
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            type="date"
            label="Adoption date"
            required
            value={adoptionDate}
            onChange={(event) => setAdoptionDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            disabled={starting}
          />
          <TextField
            size="small"
            type="date"
            label="Arrival date (optional)"
            value={arrivalDate}
            onChange={(event) => setArrivalDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            disabled={starting}
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ fontSize: "0.8125rem" }}>
            {error}
          </Alert>
        )}

        <div>
          <Button variant="contained" onClick={handleStart} disabled={starting}>
            {starting ? "Starting..." : "Start post-adoption"}
          </Button>
        </div>
      </Stack>
    </SectionCard>
  );
}

export default StartPostAdoption;
