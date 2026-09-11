import { useLocation, Link as RouterLink } from "react-router-dom";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";

function AppBreadcrumbs() {
    const location = useLocation();

    const pathParts = location.pathname
        .split("/")
        .filter(Boolean);

    if (pathParts.length === 0) {
        return null;
    }

    if (
        pathParts.length === 1 &&
        pathParts[0] === "dashboard"
    ) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Dashboard
            </Typography>
        );
    }

    return (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            <Link
                component={RouterLink}
                to="/dashboard"
                color="text.secondary"
                underline="hover"
            >
                Dashboard
            </Link>

            {pathParts.map((part, index) => {
                const label = part
                    .split("-")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");

                const path =
                    "/" + pathParts.slice(0, index + 1).join("/");

                return (
                    <span key={path}>
                        {" / "}
                        <Link
                            component={RouterLink}
                            to={path}
                            color="text.secondary"
                            underline="hover"
                        >
                            {label}
                        </Link>
                    </span>
                );
            })}
        </Typography>
    );
}

export default AppBreadcrumbs;