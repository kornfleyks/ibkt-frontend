import { useContext } from "react";
import { NotificationsContext } from "../context/notificationsContextInstance";

// { notifications, unreadCount, loading, error, markRead(id), markAllRead(), reload() }
function useNotifications() {
    return useContext(NotificationsContext);
}

export default useNotifications;
