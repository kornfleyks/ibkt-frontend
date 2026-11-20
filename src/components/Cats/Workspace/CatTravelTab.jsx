import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import SectionCard from "../../Common/SectionCard";
import TravelFields from "../../ActiveApplications/Workspace/Travel/TravelFields";
import { getCatTravel, updateCatTravel } from "../../../services/TravelService";

// The travel record of the application this cat is matched to, shown and
// edited here as well as on the application's Travel tab (same record, same
// rules, same access: Admins and that application's Case Owner). A record is
// started from the application, so with none this tab links there.
function CatTravelTab({ cat }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // The user may not see the application's travel details.
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setRestricted(false);

      try {
        const answer = await getCatTravel(cat.id);

        if (!cancelled) setData(answer);
      } catch (err) {
        console.error("Failed to load the cat's travel:", err);

        if (cancelled) return;

        if (err?.status === 403) setRestricted(true);
        else setError(err?.message || "Failed to load the travel record.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [cat.id]);

  // Throws on failure so the field being edited can show it too.
  async function save(changes) {
    setError(null);

    try {
      const saved = await updateCatTravel(cat.id, data.record.id, changes);

      setData((current) => ({ ...current, record: saved.record }));
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

  if (restricted) {
    return <Alert severity="info">The travel details are only visible to Admins and the Case Owner of the application this cat is matched to.</Alert>;
  }

  if (error && !data) return <Alert severity="error">{error}</Alert>;

  if (!data?.application) {
    return <Typography color="text.secondary">This cat is not matched to an application yet, so there is no travel record.</Typography>;
  }

  const applicationLink = `/active-applications/${data.application.id}?tab=travel`;

  if (!data.record) {
    return (
      <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
        <Typography color="text.secondary">{`The application ${data.application.name} has no travel record yet. Start one on the application's Travel tab.`}</Typography>
        <Button component={RouterLink} to={applicationLink} variant="contained" size="small">
          Open the application
        </Button>
      </Stack>
    );
  }

  return (
    <SectionCard title="Travel">
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
          <Typography color="text.secondary">Application:</Typography>
          <Button component={RouterLink} to={applicationLink} size="small">
            {data.application.name}
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <TravelFields record={data.record} save={save} />
      </Stack>
    </SectionCard>
  );
}

export default CatTravelTab;
