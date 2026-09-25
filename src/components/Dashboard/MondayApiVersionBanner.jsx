import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Button } from "@mui/material";

import useAuth from "../../hooks/useAuth";
import { canAccessPath } from "../../utils/navigationAccess";
import { ROLES } from "../../constants/roles";
import {
  getMondayApiVersionStatus,
  describeMondayApiVersionStatus,
} from "../../services/MondayApiVersionService";

// Shown to Admins on the Dashboard only while the pinned Monday API
// version needs updating (maintenance, deprecated). Renders nothing
// otherwise, or if the status can't be loaded.
function MondayApiVersionBanner() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    let cancelled = false;

    getMondayApiVersionStatus()
      .then((data) => {
        if (!cancelled) {
          setStatus(data);
        }
      })
      .catch((err) => console.error("Failed to load Monday API version status:", err));

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!isAdmin || !status || !["update_due", "deprecated"].includes(status.status)) {
    return null;
  }

  const { severity, text } = describeMondayApiVersionStatus(status);

  return (
    <Alert
      severity={severity}
      sx={{ mb: 3 }}
      action={
        canAccessPath("/settings", user) && (
          <Button component={RouterLink} to="/settings" color="inherit" size="small">
            Open App Settings
          </Button>
        )
      }
    >
      {text}
    </Alert>
  );
}

export default MondayApiVersionBanner;
