import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import LoginIcon from '@mui/icons-material/LoginOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAddOutlined';
import KeyIcon from '@mui/icons-material/KeyOutlined';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';

const activityTypes = {
    Created: { icon: AddCircleOutlineIcon, color: 'success' },
    Updated: { icon: EditIcon, color: 'primary' },
    Commented: { icon: ChatBubbleOutlineIcon, color: 'secondary' },
    Login: { icon: LoginIcon, color: 'info' },
    Logout: { icon: LogoutIcon, color: 'default' },
    Register: { icon: PersonAddIcon, color: 'success' },
    'Password Reset': { icon: KeyIcon, color: 'warning' },
    Approved: { icon: AddCircleOutlineIcon, color: 'success' },
    Rejected: { icon: EditIcon, color: 'error' },
};

export const DEFAULT_ACTIVITY_TYPE = { icon: HistoryIcon, color: 'default' };

export default activityTypes;
