import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

// Shown instead of a record's details when the ownership rule
// (utils/ownership.js) hides it from the current user, e.g. a bookmarked
// or shared link to someone else's case.
function NotAssignedNotice({ message = "This case isn't assigned to you.", backTo, backLabel }) {
    return (
        <Alert
            severity="info"
            action={
                backTo && (
                    <Button component={RouterLink} to={backTo} color="inherit" size="small">
                        {backLabel}
                    </Button>
                )
            }
        >
            {message} Ask an Admin or the case owner if you need access.
        </Alert>
    );
}

export default NotAssignedNotice;
