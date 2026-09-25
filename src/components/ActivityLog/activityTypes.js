import { AddCircleOutlineIcon, EditIcon, ChatBubbleOutlineIcon, LoginIcon, LogoutIcon, PersonAddIcon, KeyIcon, HistoryIcon } from '../icons';

// `color` is a literal Avatar bgcolor value: a theme palette path
// ('success.main') or a plain hex for a hue the palette doesn't have.
const activityTypes = {
    Created: { icon: AddCircleOutlineIcon, color: 'success.main' },
    // Vibe's purple, not a palette slot - the 5 real accent colors
    // (success/error/warning/info/secondary) are already spoken for below,
    // and Updated is the single most frequent action type, so it gets its
    // own hue rather than sharing one and reading as ambiguous.
    Updated: { icon: EditIcon, color: '#a25ddc' },
    Commented: { icon: ChatBubbleOutlineIcon, color: 'secondary.main' },
    Login: { icon: LoginIcon, color: 'info.main' },
    Logout: { icon: LogoutIcon, color: 'secondary.main' },
    Register: { icon: PersonAddIcon, color: 'success.main' },
    // warning.dark: the white icon is unreadable on Vibe's bright yellow.
    'Password Reset': { icon: KeyIcon, color: 'warning.dark' },
    Approved: { icon: AddCircleOutlineIcon, color: 'success.main' },
    Rejected: { icon: EditIcon, color: 'error.main' },
};

export const DEFAULT_ACTIVITY_TYPE = { icon: HistoryIcon, color: 'secondary.main' };

export default activityTypes;
