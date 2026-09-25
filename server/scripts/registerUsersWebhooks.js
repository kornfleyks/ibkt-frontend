// One-off: registers Monday webhooks so edits made directly on the Users
// board's Status and Role columns reach this server (see webhooks.js).
//
//   npm run register:users-webhooks -- https://your-public-server.example.com
//
// Needs MONDAY_WEBHOOK_SECRET in .env (a long random string) and the server
// already running at that public URL - Monday verifies the URL on creation.
// Run once per environment; running again creates duplicate webhooks.
import "dotenv/config";
import { USERS } from "../../src/constants/boards/users.js";

const baseUrl = process.argv[2]?.replace(/\/+$/, "");
const secret = process.env.MONDAY_WEBHOOK_SECRET;

if (!baseUrl || !/^https:\/\//.test(baseUrl)) {
  console.error("Usage: npm run register:users-webhooks -- https://your-public-server.example.com");
  process.exit(1);
}

if (!secret) {
  console.error("Set MONDAY_WEBHOOK_SECRET in server/.env first.");
  process.exit(1);
}

const url = `${baseUrl}/api/webhooks/monday/${secret}`;

if (url.length > 255) {
  console.error("Webhook URL is longer than Monday's 255-character limit - use a shorter secret.");
  process.exit(1);
}

async function createWebhook(columnId) {
  const response = await fetch(process.env.MONDAY_API_URL, {
    method: "POST",
    headers: { Authorization: process.env.MONDAY_API_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `mutation ($boardId: ID!, $url: String!, $config: JSON) {
        create_webhook(board_id: $boardId, url: $url, event: change_specific_column_value, config: $config) { id }
      }`,
      variables: { boardId: USERS.BOARD_ID, url, config: JSON.stringify({ columnId }) },
    }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data.create_webhook.id;
}

for (const [label, columnId] of [["Account Status", USERS.COLUMNS.ACCOUNT_STATUS], ["Role", USERS.COLUMNS.ROLE]]) {
  try {
    console.log(`${label}: webhook ${await createWebhook(columnId)} created.`);
  } catch (err) {
    console.error(`${label}: failed - ${err.message}`);
    process.exitCode = 1;
  }
}
