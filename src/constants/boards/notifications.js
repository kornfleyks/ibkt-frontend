// Created by server/scripts/createNotificationsBoard.js. One row per in-app
// notification; only the server reads or writes it (see server/notifications.js).
export const NOTIFICATIONS = {
  BOARD_ID: "5104971962",
  COLUMNS: {
    NAME: "name", // Name | name
    RECIPIENT_ID: "text_mm7h1s3v", // Recipient ID | text
    RECIPIENT_NAME: "text_mm7hxe23", // Recipient Name | text
    TYPE: "color_mm7h6fjv", // Type | status
    READ: "color_mm7hh88y", // Read | status
    ACTOR_ID: "text_mm7hjket", // Actor ID | text
    ACTOR_NAME: "text_mm7h5d3w", // Actor Name | text
    TARGET_BOARD_ID: "text_mm7h2na0", // Target Board ID | text
    TARGET_ITEM_ID: "text_mm7hps1a", // Target Item ID | text
    TARGET_NAME: "text_mm7hf0jk", // Target Name | text
    LINK: "text_mm7h7xzc", // Link | text
    CREATED_AT: "date_mm7havtw", // Created At | date
  },
};
