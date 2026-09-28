// One-off: adds the long-text "Preferences" column to the Users board (per-
// user settings from the Account page, see server/account.js) and prints
// the id to put in src/constants/boards/users.js as PREFERENCES.
//
//   npm run create:users-preferences-column
//
// Safe to re-run: an existing "Preferences" column is reused, not
// duplicated. Afterwards it reads the column back through an item query,
// because some Users columns have existed on the board without ever being
// returned by the API (see the Last Login history) - if that happens here,
// delete and recreate the column on Monday before using it.
import "dotenv/config";
import { USERS } from "../../src/constants/boards/users.js";
import { mondayHeaders } from "../mondayApiVersion.js";
import { mondayFetch } from "../mondayRateLimit.js";

const TITLE = "Preferences";

async function monday(query, variables = {}) {
  const response = await mondayFetch(process.env.MONDAY_API_URL, {
    method: "POST",
    headers: mondayHeaders(),
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

const { boards } = await monday(
  `query ($boardId: ID!) {
    boards(ids: [$boardId]) {
      columns { id title type }
      items_page(limit: 1) { items { id } }
    }
  }`,
  { boardId: USERS.BOARD_ID },
);

const board = boards[0];
let column = board.columns.find((candidate) => candidate.title === TITLE);

if (column) {
  console.log(`Column already exists: ${column.id} (${column.type}) - not creating another.`);

  if (column.type !== "long_text") {
    console.error(`It is a ${column.type} column, not long_text. Rename or remove it on Monday first.`);
    process.exit(1);
  }
} else {
  const { create_column: created } = await monday(
    `mutation ($boardId: ID!, $title: String!, $description: String) {
      create_column(board_id: $boardId, title: $title, column_type: long_text, description: $description) { id }
    }`,
    {
      boardId: USERS.BOARD_ID,
      title: TITLE,
      description: "Per-user app settings (JSON) written by the Account page. Don't edit by hand.",
    },
  );

  column = { id: created.id, type: "long_text" };
  console.log(`Created column: ${column.id}`);
}

const sampleItem = board.items_page.items[0];

if (!sampleItem) {
  console.log("No items on the board to verify the column against - check it after the first user exists.");
} else {
  const { items } = await monday(
    `query ($ids: [ID!], $columnIds: [String!]) {
      items(ids: $ids) { column_values(ids: $columnIds) { id } }
    }`,
    { ids: [sampleItem.id], columnIds: [column.id] },
  );

  const returned = items[0]?.column_values.some((value) => value.id === column.id);

  if (!returned) {
    console.error("The API did not return the new column on an item. Delete it on Monday and run this again.");
    process.exit(1);
  }

  console.log("Verified: the API returns the column on items.");
}

console.log(`\nAdd to src/constants/boards/users.js COLUMNS:\n    PREFERENCES: "${column.id}", // Preferences | long_text`);
