import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import PetsIcon from "@mui/icons-material/PetsOutlined";
//import PersonIcon from "@mui/icons-material/PersonOutlined";
import AssignmentIcon from "@mui/icons-material/AssignmentOutlined";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivismOutlined";
import FavoriteIcon from "@mui/icons-material/FavoriteOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";

export const navigationItems = [
    {
        title: "Dashboard",
        path: "/dashboard",
        icon: DashboardIcon,
        roles: ["Administrator", "Volunteer", "Rescuer", "Foster", "Adopter", "SuperAdmin"]
    },
    {
        title: "Cats",
        path: "/cats",
        icon: PetsIcon,
        roles: ["Administrator", "Volunteer"]
    },
    // {
    //     title: "Adopters",
    //     path: "/adopters",
    //     icon: PersonIcon,
    //     roles: ["Administrator", "Volunteer"]
    // },
    {
        title: "Active Applications",
        path: "/active-applications",
        icon: AssignmentIcon,
        roles: ["Administrator", "Volunteer"]
    },
    {
        title: "Matching",
        path: "/matching",
        icon: FavoriteIcon,
        roles: ["Administrator", "Volunteer"]
    },
    {
        title: "Adoptions",
        path: "/adoptions",
        icon: VolunteerActivismIcon,
        roles: ["Administrator", "Volunteer", "SuperAdmin"]
    },
    {
        title: "Tasks",
        path: "/tasks",
        icon: CheckCircleIcon,
        roles: ["Administrator", "Volunteer", "Rescuer", "Foster"]
    }
];