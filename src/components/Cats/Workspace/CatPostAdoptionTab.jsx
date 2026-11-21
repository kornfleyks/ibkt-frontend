import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import PostAdoptionTab from "../../ActiveApplications/Workspace/PostAdoption/PostAdoptionTab";
import { getActiveApplication } from "../../../services/ActiveApplicationsService";

// The post-adoption record of the application this cat is matched to, shown and
// edited here as well as on the application's Post Adoption tab: it is the same
// tab, so the same record, rules and access (Admins and that application's Case
// Owner, enforced by the application's own routes).
function CatPostAdoptionTab({ cat }) {
  const applicationId = cat.linkedAdopterId;
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(Boolean(applicationId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!applicationId) return undefined;

    let cancelled = false;

    getActiveApplication(applicationId)
      .then((found) => {
        if (cancelled) return;

        setApplication(found);
        setError(found ? null : "The application this cat is matched to was not found.");
      })
      .catch((err) => {
        console.error("Failed to load the cat's application:", err);

        if (!cancelled) setError(err?.message || "Failed to load the application.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (!applicationId) {
    return <Typography color="text.secondary">This cat is not matched to an application yet, so there is no post-adoption record.</Typography>;
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: "center", py: 4 }}>
        <CircularProgress size={28} sx={{ color: "text.secondary" }} />
      </Stack>
    );
  }

  if (error || !application) return <Alert severity="error">{error || "Failed to load the application."}</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
        <Typography color="text.secondary">Application:</Typography>
        <Button component={RouterLink} to={`/active-applications/${applicationId}?tab=post-adoption`} size="small">
          {application.name}
        </Button>
      </Stack>

      <PostAdoptionTab application={application} />
    </Stack>
  );
}

export default CatPostAdoptionTab;
