import { Navigate } from 'react-router-dom';

import useAuth from '../../hooks/useAuth';
import { ROLES, portalOfRole } from '../../constants/roles';

// Guards the foster portal's pages: signed out goes to the foster sign-in, and
// anyone who is not a foster goes to their own home: the staff app, or the
// rescuer portal. (The server decides what a foster may actually do; this only
// picks the right door.)
function FosterRoute({ children }) {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/foster/login" replace />;
    }

    if (user?.role !== ROLES.FOSTER) {
        return <Navigate to={portalOfRole(user?.role)?.home ?? '/dashboard'} replace />;
    }

    return children;
}

export default FosterRoute;
