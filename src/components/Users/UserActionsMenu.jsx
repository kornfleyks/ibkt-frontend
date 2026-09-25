import { useState } from 'react';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { MoreVertIcon, InfoIcon } from '../icons';
import { USER_STATUS_ACTIONS } from './userStatusActions';

// The Users table's per-row "⋮" menu: View details, then whichever status
// actions this account allows (`actions`, keys of USER_STATUS_ACTIONS).
// Each action only opens its confirmation dialog - nothing changes here.
function UserActionsMenu({ user, actions, onRequestAction, onOpenDetails }) {
    const [anchorEl, setAnchorEl] = useState(null);

    function choose(callback) {
        setAnchorEl(null);
        callback();
    }

    return (
        <>
            <IconButton
                size="small"
                onClick={(event) => setAnchorEl(event.currentTarget)}
                aria-label={`Actions for ${user.email}`}
                aria-haspopup="menu"
                aria-expanded={Boolean(anchorEl)}
            >
                <MoreVertIcon fontSize="small" />
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem onClick={() => choose(() => onOpenDetails(user))}>
                    <ListItemIcon>
                        <InfoIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>View details</ListItemText>
                </MenuItem>

                {actions.length > 0 && <Divider />}

                {actions.map((action) => {
                    const config = USER_STATUS_ACTIONS[action];

                    return (
                        <MenuItem
                            key={action}
                            onClick={() => choose(() => onRequestAction(user, action))}
                            // Taking someone out of action reads as a warning.
                            sx={config.color === 'error' ? { color: 'error.main' } : undefined}
                        >
                            {config.label}
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}

export default UserActionsMenu;
