import { useState } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import SectionCard from "../../../Common/SectionCard";
import { startTravel } from "../../../../services/TravelService";

// No travel record yet: create one, linked to the application and its cat.
// The travel date is optional and can be set later.
function StartTravel({ applicationId, onStarted }) {
  const [travelDate, setTravelDate] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  async function handleStart() {
    setStarting(true);
    setError(null);

    try {
      onStarted(await startTravel(applicationId, { travelDate: travelDate || null }));
    } catch (err) {
      console.error("Failed to start travel:", err);
      setError(err?.message || "Something went wrong while starting the travel record.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <SectionCard title="Travel">
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography color="text.secondary">
          This application has no travel record yet. Starting one links it to the application and its cat, with the status Planning. The crate,
          flight and dates are filled in afterwards.
        </Typography>

        <TextField
          size="small"
          type="date"
          label="Travel date (optional)"
          value={travelDate}
          onChange={(event) => setTravelDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          disabled={starting}
          sx={{ maxWidth: 240 }}
        />

        {error && (
          <Alert severity="error" sx={{ fontSize: "0.8125rem" }}>
            {error}
          </Alert>
        )}

        <div>
          <Button variant="contained" onClick={handleStart} disabled={starting}>
            {starting ? "Starting..." : "Start travel"}
          </Button>
        </div>
      </Stack>
    </SectionCard>
  );
}

export default StartTravel;
