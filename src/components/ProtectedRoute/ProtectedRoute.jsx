import { Navigate } from "react-router-dom";

import useAuth from "../../hooks/useAuth";

function ProtectedRoute({ children, roles = [], emails = [] }) {
  const { isAuthenticated, user, roleChange } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    // A live role change just removed access to this page: go somewhere
    // everyone can use (the role-change notice explains why) rather than
    // showing Forbidden for a page they were legitimately on.
    return <Navigate to={roleChange ? "/dashboard" : "/forbidden"} replace />;
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
