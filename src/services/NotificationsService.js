import { serverGet, serverPost } from "./MondayService";

// In-app notifications live on a Monday board only the server reads (see
// server/notifications.js), so everything here goes through its endpoints.

// { notifications: [latest 30, newest first], unreadCount }
export async function getNotifications() {
  return serverGet("/api/notifications");
}

export async function markNotificationRead(notificationId) {
  return serverPost(`/api/notifications/${notificationId}/read`, {});
}

export async function markAllNotificationsRead() {
  return serverPost("/api/notifications/read-all", {});
}
