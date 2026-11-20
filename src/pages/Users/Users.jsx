import UsersManager from '../../components/Users/UsersManager';
import { USERS_STATUS_OPTIONS } from '../../constants/statuses/usersStatuses';

const { ROLE } = USERS_STATUS_OPTIONS;

// Everyone with a login except rescuers and fosters, who have their own pages
// (pages/Rescuers and pages/Fosters, the same component for one role each).
// Super Admin is never picked here, and neither are Rescuer and Foster: they
// are made through their own pages.
const hasOwnPage = (role) => role === ROLE.RESCUER || role === ROLE.FOSTER;
const isStaffOrOther = (user) => !hasOwnPage(user.role);
const ROLE_OPTIONS = Object.values(ROLE).filter((role) => role !== ROLE.SUPER_ADMIN && !hasOwnPage(role));

function Users() {
    return <UsersManager include={isStaffOrOther} roleOptions={ROLE_OPTIONS} />;
}

export default Users;
