import { mondayRequest, serverGet, serverPost } from "./MondayService";

// A Communications thread is the Monday updates on one item (a cat today;
// applications later - see constants/communicationBoards.js).
//
// The app talks to Monday through one shared service-account token, so
// every update's real `creator` is always that same account - not whoever
// is actually logged into the app. The server embeds the real author in the
// update body when posting (see server/communications.js) and it's parsed
// back out here.
const AUTHOR_PREFIX_PATTERN = /^\[(.+?) - (.+?)\]\s([\s\S]*)$/;

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

export async function getCommunications(itemId) {
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

  const data = await mondayRequest(query, { itemId: [itemId] });
  const updates = data.items[0]?.updates ?? [];

  // Monday returns updates newest-first; a message thread reads oldest-first.
  return updates.slice().reverse().map(mapUpdate);
}

// `text` may contain @mention tokens (utils/mentions.js); the server keeps
// only those of Active users and notifies them.
export async function createCommunication(boardId, itemId, text) {
  const { update } = await serverPost(`/api/communications/${boardId}/${itemId}`, { text });

  return mapUpdate(update);
}

// [{ id, name, role }] - Active accounts that can be @mentioned.
export async function getMentionableUsers() {
  const { users } = await serverGet("/api/users/mentionable");

  return users;
}
