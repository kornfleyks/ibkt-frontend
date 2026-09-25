import { createElement } from "react";
import SvgIcon from "@mui/material/SvgIcon";
import PetsOutlined from "@mui/icons-material/PetsOutlined";
import {
  Add,
  CheckList,
  Check,
  Close,
  CloseRound,
  Comment,
  Completed,
  Dashboard,
  Delete,
  Edit,
  ExternalPage,
  Folder,
  Form,
  Globe,
  Heart,
  Home,
  Info,
  Invite,
  Key,
  Lines,
  Link,
  Locked,
  LogIn,
  LogOut,
  Mention,
  Menu,
  Moon,
  MoveArrowRight,
  Notifications,
  Person,
  Play,
  Search,
  Settings,
  Show,
  Sun,
  Team,
  Time,
  Upload,
  UserStatus,
  Warning,
} from "@vibe/icons";

// The app's icons, drawn with monday.com's Vibe icon set. Each Vibe icon is
// rendered through MUI's SvgIcon, so every existing usage keeps working
// unchanged: fontSize, sx, color, and passing the component itself as a
// prop (nav items, startIcon, Chip icon). Vibe icons use a 20x20 grid.
function fromVibe(VibeIcon, displayName) {
  function Icon(props) {
    return createElement(SvgIcon, { component: VibeIcon, inheritViewBox: true, ...props });
  }

  Icon.displayName = displayName;
  // Lets MUI components that special-case icons (e.g. InputAdornment,
  // ListItemIcon) recognise these like their own.
  Icon.muiName = SvgIcon.muiName;

  return Icon;
}

export const AddIcon = fromVibe(Add, "AddIcon");
export const AddCircleOutlineIcon = fromVibe(Add, "AddCircleOutlineIcon");
export const AlternateEmailIcon = fromVibe(Mention, "AlternateEmailIcon");
export const ArrowForwardIcon = fromVibe(MoveArrowRight, "ArrowForwardIcon");
export const AssignmentIcon = fromVibe(Form, "AssignmentIcon");
export const AssignmentIndIcon = fromVibe(UserStatus, "AssignmentIndIcon");
export const CancelIcon = fromVibe(CloseRound, "CancelIcon");
export const ChatBubbleOutlineIcon = fromVibe(Comment, "ChatBubbleOutlineIcon");
export const CheckCircleIcon = fromVibe(Completed, "CheckCircleIcon");
export const CheckIcon = fromVibe(Check, "CheckIcon");
export const CheckListIcon = fromVibe(CheckList, "CheckListIcon");
export const CloseIcon = fromVibe(Close, "CloseIcon");
export const DarkModeIcon = fromVibe(Moon, "DarkModeIcon");
export const DashboardIcon = fromVibe(Dashboard, "DashboardIcon");
export const DeleteIcon = fromVibe(Delete, "DeleteIcon");
export const EditIcon = fromVibe(Edit, "EditIcon");
export const FavoriteIcon = fromVibe(Heart, "FavoriteIcon");
export const FlightTakeoffIcon = fromVibe(Globe, "FlightTakeoffIcon");
export const FolderSharedIcon = fromVibe(Folder, "FolderSharedIcon");
export const GroupIcon = fromVibe(Team, "GroupIcon");
export const HistoryIcon = fromVibe(Time, "HistoryIcon");
export const InfoIcon = fromVibe(Info, "InfoIcon");
export const KeyIcon = fromVibe(Key, "KeyIcon");
export const LightModeIcon = fromVibe(Sun, "LightModeIcon");
export const LinkIcon = fromVibe(Link, "LinkIcon");
export const LockIcon = fromVibe(Locked, "LockIcon");
export const LoginIcon = fromVibe(LogIn, "LoginIcon");
export const LogoutIcon = fromVibe(LogOut, "LogoutIcon");
export const MenuIcon = fromVibe(Lines, "MenuIcon");
// Vibe's "Menu" is the three-dots icon; its "MoreActions" is a double chevron.
export const MoreVertIcon = fromVibe(Menu, "MoreVertIcon");
export const NotificationsIcon = fromVibe(Notifications, "NotificationsIcon");
export const OpenInNewIcon = fromVibe(ExternalPage, "OpenInNewIcon");
export const PersonAddIcon = fromVibe(Invite, "PersonAddIcon");
export const PersonIcon = fromVibe(Person, "PersonIcon");
export const PlayCircleIcon = fromVibe(Play, "PlayCircleIcon");
export const ReportProblemIcon = fromVibe(Warning, "ReportProblemIcon");
export const SearchIcon = fromVibe(Search, "SearchIcon");
export const SettingsIcon = fromVibe(Settings, "SettingsIcon");
export const UploadIcon = fromVibe(Upload, "UploadIcon");
export const VisibilityIcon = fromVibe(Show, "VisibilityIcon");
export const VolunteerActivismIcon = fromVibe(Home, "VolunteerActivismIcon");

// Vibe has no animal icons, so the cat paw stays MUI's.
export const PetsIcon = PetsOutlined;
