import { useCallback, useEffect, useRef, useState } from "react";
import useAuth from "../hooks/useAuth";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/NotificationsService";
import { NOTIFICATION_RECEIVED_EVENT, SESSION_CONNECTED_EVENT } from "../services/sessionEvents";
import { NotificationsContext } from "./notificationsContextInstance";

// A (re)connect right after a load doesn't need another Monday read.
const RELOAD_GRACE_MS = 5_000;

const EMPTY = { notifications: [], unreadCount: 0 };

// The signed-in user's notifications: loaded once per session (and again
// after the live stream reconnects, in case something was missed), then
// kept current by pushes from the server - no polling.
//
// Keyed by user id, so signing out or switching account starts from an
// empty list instead of briefly showing the previous user's.
function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return (
    <NotificationsStore key={userId ?? "signed-out"} userId={userId}>
      {children}
    </NotificationsStore>
  );
}

function NotificationsStore({ userId, children }) {
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(null);
  const lastLoadedAt = useRef(0);

  // `loading` is only the first load (it starts true); later reloads
  // refresh quietly behind the list already shown.
  const reload = useCallback(() => {
    lastLoadedAt.current = Date.now();

    return getNotifications()
      .then((data) => {
        setState({ notifications: data.notifications, unreadCount: data.unreadCount });
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load notifications:", err);
        setError("Couldn't load notifications.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    reload();

    function handleConnected() {
      if (Date.now() - lastLoadedAt.current > RELOAD_GRACE_MS) {
        reload();
      }
    }

    function handleReceived(event) {
      const notification = event.detail;

      setState((current) =>
        current.notifications.some((existing) => existing.id === notification.id)
          ? current
          : {
              notifications: [notification, ...current.notifications],
              unreadCount: current.unreadCount + (notification.read ? 0 : 1),
            },
      );
    }

    window.addEventListener(SESSION_CONNECTED_EVENT, handleConnected);
    window.addEventListener(NOTIFICATION_RECEIVED_EVENT, handleReceived);

    return () => {
      window.removeEventListener(SESSION_CONNECTED_EVENT, handleConnected);
      window.removeEventListener(NOTIFICATION_RECEIVED_EVENT, handleReceived);
    };
  }, [userId, reload]);

  // Optimistic: the list updates straight away; a failed save reloads the
  // real state from the server.
  async function markRead(notificationId) {
    const target = state.notifications.find((notification) => notification.id === notificationId);

    if (!target || target.read) {
      return;
    }

    setState((current) => ({
      notifications: current.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
      unreadCount: Math.max(0, current.unreadCount - 1),
    }));

    try {
      await markNotificationRead(notificationId);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
      reload();
    }
  }

  async function markAllRead() {
    if (state.unreadCount === 0) {
      return;
    }

    setState((current) => ({
      notifications: current.notifications.map((notification) => ({ ...notification, read: true })),
      unreadCount: 0,
    }));

    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
      reload();
    }
  }

  const value = {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    reload,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export { NotificationsProvider };
