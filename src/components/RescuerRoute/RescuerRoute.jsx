import { Navigate } from 'react-router-dom';

import useAuth from '../../hooks/useAuth';
import { ROLES, portalOfRole } from '../../constants/roles';

// Guards the rescuer portal's pages: signed out goes to the rescuer sign-in,
// and anyone who is not a rescuer goes to their own home: the staff app, or
// the foster portal. (The server decides what a rescuer may actually do; this
// only picks the right door.)
function RescuerRoute({ children }) {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/rescuer/login" replace />;
    }

    if (user?.role !== ROLES.RESCUER) {
        return <Navigate to={portalOfRole(user?.role)?.home ?? '/dashboard'} replace />;
    }

    return children;
}

export default RescuerRoute;
