import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import PetsIcon from "@mui/icons-material/PetsOutlined";
//import PersonIcon from "@mui/icons-material/PersonOutlined";
import AssignmentIcon from "@mui/icons-material/AssignmentOutlined";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivismOutlined";
import FavoriteIcon from "@mui/icons-material/FavoriteOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import GroupIcon from "@mui/icons-material/GroupOutlined";
import HistoryIcon from "@mui/icons-material/HistoryOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";

export const navigationItems = [
    {
        title: "Dashboard",
        path: "/dashboard",
        icon: DashboardIcon,
        roles: ["Admin", "Volunteer", "Rescuer", "Foster", "Adopter"]
    },
    {
        title: "Cats",
        path: "/cats",
        icon: PetsIcon,
        roles: ["Admin", "Volunteer"]
    },
    // {
    //     title: "Adopters",
    //     path: "/adopters",
    //     icon: PersonIcon,
    //     roles: ["Admin", "Volunteer"]
    // },
    {
        title: "Active Applications",
        path: "/active-applications",
        icon: AssignmentIcon,
        roles: ["Admin", "Volunteer"]
    },
    {
        title: "Matching",
        path: "/matching",
        icon: FavoriteIcon,
        roles: ["Admin", "Volunteer"]
    },
    {
        title: "Adoptions",
        path: "/adoptions",
        icon: VolunteerActivismIcon,
        roles: ["Admin", "Volunteer"]
    },
    {
        title: "Tasks",
        path: "/tasks",
        icon: CheckCircleIcon,
        roles: ["Admin", "Volunteer", "Rescuer", "Foster"]
    },
    {
        title: "Users",
        path: "/users",
        icon: GroupIcon,
        roles: ["Admin"]
    },
    {
        title: "Activity Log",
        path: "/activity",
        icon: HistoryIcon,
        roles: ["Admin"]
    },
    {
        title: "App Settings",
        path: "/settings",
        icon: SettingsIcon,
        roles: ["Admin"],
        emails: ["billkifonidis@gmail.com"]
    }
];
