import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  Typography,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/NotificationsOutlined";
import TaskIcon from "@mui/icons-material/AssignmentOutlined";
import CaseIcon from "@mui/icons-material/FolderSharedOutlined";
import MentionIcon from "@mui/icons-material/AlternateEmailOutlined";

import useAuth from "../../hooks/useAuth";
import useNotifications from "../../hooks/useNotifications";
import { canAccessPath } from "../../utils/navigationAccess";
import { formatRelativeTime } from "../../utils/relativeTime";
import { NOTIFICATIONS_STATUS_OPTIONS } from "../../constants/statuses/notificationsStatuses";

const { TYPE } = NOTIFICATIONS_STATUS_OPTIONS;

const TYPE_ICONS = {
  [TYPE.TASK_ASSIGNED]: TaskIcon,
  [TYPE.TASK_UNASSIGNED]: TaskIcon,
  [TYPE.CASE_ASSIGNED]: CaseIcon,
  [TYPE.CASE_UNASSIGNED]: CaseIcon,
  [TYPE.MENTION]: MentionIcon,
};

const TASK_TYPES = [TYPE.TASK_ASSIGNED, TYPE.TASK_UNASSIGNED];

// Where clicking a notification goes: its link when this user can open that
// section; a task on a cat page they can't open falls back to Tasks.
function destinationFor(notification, user) {
  const link = notification.link || "";
  const section = `/${link.split("?")[0].split("/")[1] ?? ""}`;

  if (link && canAccessPath(section, user)) {
    return link;
  }

  if (TASK_TYPES.includes(notification.type) && canAccessPath("/tasks", user)) {
    return "/tasks";
  }

  return null;
}

function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications();
  const [anchor, setAnchor] = useState(null);

  function handleOpen(notification) {
    setAnchor(null);
    markRead(notification.id);

    const destination = destinationFor(notification, user);

    if (destination) {
      navigate(destination);
    }
  }

  return (
    <>
      <IconButton
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label={unreadCount ? `Show notifications, ${unreadCount} unread` : "Show notifications"}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: "calc(100vw - 32px)" } } }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>

          <Button size="small" onClick={markAllRead} disabled={unreadCount === 0}>
            Mark all read
          </Button>
        </Box>

        {loading && notifications.length === 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={24} sx={{ color: "text.secondary" }} />
          </Box>
        )}

        {!loading && error && notifications.length === 0 && (
          <Typography color="error" variant="body2" sx={{ px: 2, py: 3 }}>
            {error}
          </Typography>
        )}

        {!loading && !error && notifications.length === 0 && (
          <Typography color="text.secondary" variant="body2" sx={{ px: 2, py: 3 }}>
            You're all caught up.
          </Typography>
        )}

        {notifications.length > 0 && (
          <List disablePadding sx={{ maxHeight: 420, overflowY: "auto" }}>
            {notifications.map((notification) => {
              const Icon = TYPE_ICONS[notification.type] ?? NotificationsIcon;
              const time = notification.createdAt ? formatRelativeTime(new Date(notification.createdAt)) : null;

              return (
                <ListItemButton
                  key={notification.id}
                  onClick={() => handleOpen(notification)}
                  sx={{ alignItems: "flex-start", gap: 1, bgcolor: notification.read ? "transparent" : "action.hover" }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mt: 0.5 }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>

                  <ListItemText
                    primary={notification.message}
                    secondary={time}
                    slotProps={{
                      primary: { variant: "body2", sx: { fontWeight: notification.read ? 400 : 600 } },
                      secondary: { variant: "caption" },
                    }}
                  />

                  {!notification.read && (
                    <Box
                      aria-label="Unread"
                      sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "error.main", mt: 1, flexShrink: 0 }}
                    />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Popover>
    </>
  );
}

export default NotificationBell;
