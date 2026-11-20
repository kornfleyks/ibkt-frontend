// Status labels on the Notifications board.
export const NOTIFICATIONS_STATUS_OPTIONS = {
  TYPE: {
    TASK_ASSIGNED: "Task Assigned",
    TASK_UNASSIGNED: "Task Unassigned",
    CASE_ASSIGNED: "Case Assigned",
    CASE_UNASSIGNED: "Case Unassigned",
    MENTION: "Mention",
    POST_ADOPTION_ASSIGNED: "Post-Adoption Assigned",
    POST_ADOPTION_UNASSIGNED: "Post-Adoption Unassigned",
    // Created on the board the first time one is sent (create_labels_if_missing).
    VOLUNTEER_ASSIGNED: "Volunteer Assigned",
    VOLUNTEER_UNASSIGNED: "Volunteer Unassigned",
    // A Jotform submission no application could be found for (Admins).
    UNMATCHED_SUBMISSION: "Unmatched Submission",
    ESCALATION: "Escalation",
    // Created on the board the first time one is sent (create_labels_if_missing).
    API_VERSION: "API Version",
    // A new rescuer application to review (Admins). Created on the board the
    // first time one is sent (create_labels_if_missing).
    RESCUER_APPLICATION: "Rescuer Application",
    // A new foster application to review (Admins). Created on the board the
    // first time one is sent (create_labels_if_missing).
    FOSTER_APPLICATION: "Foster Application",
    // A foster sent a Kitty Profile for a cat, to review and apply (staff).
    // Created on the board the first time one is sent (create_labels_if_missing).
    FOSTER_PROFILE: "Foster Profile",
    // A cat has been Adoption Ready for 3 months (or its update request is
    // overdue): ask the rescuer or foster for news (Admins and Volunteers).
    // Created on the board the first time one is sent (create_labels_if_missing).
    CAT_UPDATE: "Cat Update",
    // A post-adoption check-in is due, or an adopter has not replied: contact
    // them again (the record's owner). Created on the board the first time one
    // is sent (create_labels_if_missing).
    POST_ADOPTION_REMINDER: "Post-Adoption Reminder",
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
