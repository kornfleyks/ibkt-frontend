import { DashboardIcon, PetsIcon, AssignmentIcon, VolunteerActivismIcon, FavoriteIcon, CheckCircleIcon, GroupIcon, HistoryIcon, SettingsIcon } from "../components/icons";
//import PersonIcon from "@mui/icons-material/PersonOutlined";

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
