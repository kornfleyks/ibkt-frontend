import { Navigate } from "react-router-dom";

import useAuth from "../../hooks/useAuth";

function ProtectedRoute({ children, roles = [], emails = [] }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  // A small number of pages are restricted to one specific account rather
  // than a whole role - e.g. App Settings. Checked in addition to `roles`,
  // not instead of it.
  if (
    emails.length > 0 &&
    !emails.some((email) => email.toLowerCase() === user?.email?.trim().toLowerCase())
  ) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}

export default ProtectedRoute;
