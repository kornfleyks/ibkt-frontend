// Status labels on the Notifications board.
export const NOTIFICATIONS_STATUS_OPTIONS = {
  TYPE: {
    TASK_ASSIGNED: "Task Assigned",
    TASK_UNASSIGNED: "Task Unassigned",
    CASE_ASSIGNED: "Case Assigned",
    CASE_UNASSIGNED: "Case Unassigned",
    MENTION: "Mention",
    // Created on the board the first time one is sent (create_labels_if_missing).
    API_VERSION: "API Version",
  },
  READ: {
    UNREAD: "Unread",
    READ: "Read",
  },
};

// Label indexes as created on the board - Monday's items_page status
// filters match on the index, not the label text.
export const NOTIFICATIONS_READ_INDEX = {
  UNREAD: 0,
  READ: 1,
};
