import { useEffect, useState } from "react";
import useAuth from "./useAuth";
import { getCaseOwnerAssignerRoles } from "../services/AppSettingsService";

// UI gate only - the server re-checks the same CASE_OWNER_ASSIGNER_ROLES
// setting on every assignment, so this just decides whether to show the
// picker. False until the setting has loaded.
function useCanAssignCaseOwner() {
  const { user } = useAuth();
  const [assignerRoles, setAssignerRoles] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getCaseOwnerAssignerRoles().then((roles) => {
      if (!cancelled) {
        setAssignerRoles(roles);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return Boolean(user && assignerRoles?.includes(user.role));
}

export default useCanAssignCaseOwner;
