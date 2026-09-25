import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import useAuth from '../../hooks/useAuth';

// Tells the signed-in person their role was changed by an Admin (it's
// applied live - see AuthProvider). If the change removed access to the
// page they were on, ProtectedRoute has already moved them to the Dashboard.
function RoleChangeNotice() {
    const { roleChange, clearRoleChange } = useAuth();

    return (
        <Snackbar
            open={Boolean(roleChange)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            autoHideDuration={12_000}
            onClose={(event, reason) => {
                // Stay put on stray clicks; close on timeout or the X.
                if (reason !== 'clickaway') {
                    clearRoleChange();
                }
            }}
        >
            <Alert severity="info" variant="filled" onClose={clearRoleChange} sx={{ width: '100%' }}>
                {roleChange &&
                    `Your role was changed from ${roleChange.from || 'none'} to ${roleChange.to}. Some pages may no longer be available.`}
            </Alert>
        </Snackbar>
    );
}

export default RoleChangeNotice;
