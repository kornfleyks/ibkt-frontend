import { useEffect, useState } from "react";
import { Alert, CircularProgress, Stack } from "@mui/material";
import SectionCard from "../../../Common/SectionCard";
import StartTravel from "./StartTravel";
import TravelFields from "./TravelFields";
import { getApplicationTravel, updateTravel } from "../../../../services/TravelService";

// The application's travel record: status, dates, the crate (size and weight
// with its unit), the flight and the notes. Every change goes to the server,
// which applies the travel rules and answers the saved record, so the tab
// always shows what was actually stored. The rest of the Travel board
// (checklist, costs, contacts) is still handled on Monday.
function TravelTab({ application }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await getApplicationTravel(application.id);

        if (!cancelled) setRecord(data.record);
      } catch (err) {
        console.error("Failed to load travel:", err);

        if (!cancelled) setError(err?.message || "Failed to load the travel record.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [application.id]);

  // Throws on failure so the field being edited can show it too.
  async function save(changes) {
    setError(null);

    try {
      const saved = await updateTravel(application.id, record.id, changes);

      setRecord(saved.record);
    } catch (err) {
      console.error("Failed to save travel:", err);
      setError(err?.message || "Something went wrong while saving.");
      throw err;
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: "center", py: 4 }}>
        <CircularProgress size={28} sx={{ color: "text.secondary" }} />
      </Stack>
    );
  }

  if (!record) {
    return error ? <Alert severity="error">{error}</Alert> : <StartTravel applicationId={application.id} onStarted={(data) => setRecord(data.record)} />;
  }

  const linkedCats = application.linkedCats ?? [];

  return (
    <SectionCard title="Travel">
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        <TravelFields record={record} save={save} linkedCats={linkedCats} />
      </Stack>
    </SectionCard>
  );
}

export default TravelTab;
