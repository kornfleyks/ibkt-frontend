// One-off: creates the Notifications board (see server/notifications.js) in
// the same workspace as the app's other boards, and prints the ids to put
// in src/constants/boards/notifications.js.
//
//   node scripts/createNotificationsBoard.js <workspaceId>
//
// Run once; running again creates a second board.
import "dotenv/config";

const workspaceId = process.argv[2];

if (!workspaceId || !/^\d+$/.test(workspaceId)) {
  console.error("Usage: node scripts/createNotificationsBoard.js <workspaceId>");
  process.exit(1);
}

async function monday(query, variables = {}) {
  const response = await fetch(process.env.MONDAY_API_URL, {
    method: "POST",
    headers: { Authorization: process.env.MONDAY_API_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

// key -> [title, type, status labels?]
const COLUMNS = [
  ["RECIPIENT_ID", "Recipient ID", "text"],
  ["RECIPIENT_NAME", "Recipient Name", "text"],
  ["TYPE", "Type", "status", ["Task Assigned", "Task Unassigned", "Case Assigned", "Case Unassigned", "Mention"]],
  ["READ", "Read", "status", ["Unread", "Read"]],
  ["ACTOR_ID", "Actor ID", "text"],
  ["ACTOR_NAME", "Actor Name", "text"],
  ["TARGET_BOARD_ID", "Target Board ID", "text"],
  ["TARGET_ITEM_ID", "Target Item ID", "text"],
  ["TARGET_NAME", "Target Name", "text"],
  ["LINK", "Link", "text"],
  ["CREATED_AT", "Created At", "date"],
];

const { create_board: board } = await monday(
  `mutation ($name: String!, $workspaceId: ID!) {
    create_board(board_name: $name, board_kind: public, workspace_id: $workspaceId) { id }
  }`,
  { name: "Notifications", workspaceId },
);

console.log(`Board: ${board.id}`);

for (const [key, title, type, labels] of COLUMNS) {
  const defaults = labels
    ? JSON.stringify({ labels: Object.fromEntries(labels.map((label, index) => [String(index), label])) })
    : undefined;

  const { create_column: column } = await monday(
    `mutation ($boardId: ID!, $title: String!, $type: ColumnType!, $defaults: JSON) {
      create_column(board_id: $boardId, title: $title, column_type: $type, defaults: $defaults) { id }
    }`,
    { boardId: board.id, title, type, defaults },
  );

  console.log(`${key}: "${column.id}", // ${title} | ${type}`);
}

// A new board can come with starter columns - list everything so any
// extras are visible.
const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type } } }`, {
  id: [board.id],
});

console.log("All columns:", JSON.stringify(boards[0].columns));
