import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import LoginIcon from '@mui/icons-material/LoginOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAddOutlined';
import KeyIcon from '@mui/icons-material/KeyOutlined';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';

// `color` is a literal Avatar bgcolor value: a theme palette path
// ('success.main') or a plain hex for a hue the palette doesn't have. Not
// 'primary.main' anywhere here - this theme sets primary.main to the same
// color as the dark-mode card background, so a 'primary' badge disappears
// entirely in dark mode.
const activityTypes = {
    Created: { icon: AddCircleOutlineIcon, color: 'success.main' },
    // A literal violet, not a palette slot - the 5 real accent colors
    // (success/error/warning/info/secondary) are already spoken for below,
    // and Updated is the single most frequent action type, so it gets its
    // own hue rather than sharing one and reading as ambiguous.
    Updated: { icon: EditIcon, color: '#7C3AED' },
    Commented: { icon: ChatBubbleOutlineIcon, color: 'secondary.main' },
    Login: { icon: LoginIcon, color: 'info.main' },
    Logout: { icon: LogoutIcon, color: 'secondary.main' },
    Register: { icon: PersonAddIcon, color: 'success.main' },
    'Password Reset': { icon: KeyIcon, color: 'warning.main' },
    Approved: { icon: AddCircleOutlineIcon, color: 'success.main' },
    Rejected: { icon: EditIcon, color: 'error.main' },
};

export const DEFAULT_ACTIVITY_TYPE = { icon: HistoryIcon, color: 'secondary.main' };

export default activityTypes;
