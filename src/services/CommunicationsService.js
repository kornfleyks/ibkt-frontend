import { mondayRequest } from "./MondayService";

// The app talks to Monday through one shared service-account token, so
// every update's real `creator` is always that same account - not whoever
// is actually logged into the app. The only way to show the real author is
// to embed it in the update body ourselves and parse it back out.
const AUTHOR_PREFIX_PATTERN = /^\[(.+?) - (.+?)\]\s([\s\S]*)$/;

export function formatCommunicationBody(user, text) {
  const author = `${user.firstName} ${user.lastName}`.trim();

  return `[${author} - ${user.role}] ${text}`;
}

function mapUpdate(update) {
  const match = AUTHOR_PREFIX_PATTERN.exec(update.text_body ?? "");

  if (match) {
    const [, author, role, message] = match;

    return {
      id: update.id,
      author,
      role,
      message,
      createdAt: update.created_at,
    };
  }

  // Doesn't match our convention - e.g. posted directly in Monday rather
  // than through this app. Fall back to whatever Monday actually knows.
  return {
    id: update.id,
    author: update.creator?.name ?? "Unknown",
    role: "",
    message: update.text_body ?? "",
    createdAt: update.created_at,
  };
}

export async function getCatCommunications(catId) {
  const query = `
    query ($itemId: [ID!]) {
      items(ids: $itemId) {
        updates(limit: 200) {
          id
          text_body
          created_at
          creator {
            name
          }
        }
      }
    }
  `;

  const data = await mondayRequest(query, { itemId: [catId] });
  const updates = data.items[0]?.updates ?? [];

  // Monday returns updates newest-first; a message thread reads oldest-first.
  return updates.slice().reverse().map(mapUpdate);
}

export async function createCatCommunication(catId, body) {
  const query = `
    mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) {
        id
        text_body
        created_at
        creator {
          name
        }
      }
    }
  `;

  const data = await mondayRequest(query, { itemId: catId, body });

  return mapUpdate(data.create_update);
}
