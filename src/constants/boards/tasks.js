// Auto-generated from Monday.com board schema.
export const TASKS = {
  BOARD_ID: "5098495153",
  COLUMNS: {
    NAME: "name", // Name | name
    SUBITEMS: "subtasks_mkrmtgvm", // Subitems | subtasks
    TASK_ID: "pulse_id_mm49ry2y", // Task ID | item_id
    STATUS: "color_mm49n2k5", // Status | status
    PRIORITY: "color_mm49pqpy", // Priority | status
    OWNER: "board_relation_mm49hhtg", // Owner | board_relation
    OWNER_ID: "lookup_mm49pxx", // Owner ID (from Users) | mirror
    LINKED_CAT: "board_relation_mm49ftve", // Linked Cat | board_relation
    LINKED_CAT_ID: "lookup_mm49kw6q", // Linked Cat ID | mirror
    LINKED_ADOPTION: "board_relation_mm49qydj", // Linked Adoption | board_relation
    LINKED_ADOPTION_ID: "lookup_mm49yrk", // Linked Adoption ID | mirror
    TASK: "dropdown_mm498nr0", // Task | dropdown
  },
  RELATIONS: {
    OWNER: ["5098492656"],
    LINKED_CAT: ["5098369241"],
    LINKED_ADOPTION: ["5098444415"],
  },
};
