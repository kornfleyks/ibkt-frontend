import { COMMUNICATION_BOARDS } from "../src/constants/communicationBoards.js";
import { extractMentionIds, keepAllowedMentions } from "../src/utils/mentions.js";
import { mondayDirectRequest } from "./mondayClient.js";
import { listActiveAccounts } from "./accountState.js";
import { clearCache } from "./mondayCache.js";
import { logActivity, getItemName } from "./activityLog.js";
import { notifyMentions } from "./notifications.js";

// Posting to an item's Communications thread (a Monday update). Goes
// through here rather than the generic proxy so that:
//   - the "[Author - Role]" prefix comes from the real session and can't
//     be faked by the browser,
//   - @mentions are checked against Active accounts before anyone is
//     notified,
//   - the thread's board is known (create_update itself carries no board).
// Works for any board listed in COMMUNICATION_BOARDS.

const ITEM_ID_PATTERN = /^\d+$/;
const MAX_MESSAGE_LENGTH = 5000;

export function registerCommunicationRoutes(app, { requireAuth }) {
  // Who can be @mentioned: Active accounts only, id/name/role, from memory.
  app.get("/api/users/mentionable", requireAuth, (req, res) => {
    res.json({ users: listActiveAccounts() });
  });

  // Body: { text }. Responds with the created update, in the same shape the
  // frontend already reads updates in.
  app.post("/api/communications/:boardId/:itemId", requireAuth, async (req, res) => {
    const { boardId, itemId } = req.params;
    const board = COMMUNICATION_BOARDS[boardId];
    const rawText = typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!board || !ITEM_ID_PATTERN.test(itemId)) {
      return res.status(400).json({ error: "This item has no communications thread." });
    }

    if (!rawText || rawText.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Messages must be 1-${MAX_MESSAGE_LENGTH} characters.` });
    }

    const activeIds = new Set(listActiveAccounts().map((account) => account.id));
    const text = keepAllowedMentions(rawText, (id) => activeIds.has(String(id)));
    const actor = { id: req.user.sub, name: `${req.user.firstName} ${req.user.lastName}`.trim() };
    const body = `[${actor.name} - ${req.user.role}] ${text}`;

    try {
      const data = await mondayDirectRequest(
        `mutation ($itemId: ID!, $body: String!) {
          create_update(item_id: $itemId, body: $body) {
            id
            text_body
            created_at
            creator { name }
          }
        }`,
        { itemId, body },
      );

      // The thread is read by item id (untagged), so this also clears it.
      clearCache([boardId]);
      res.json({ update: data.create_update });

      const itemName = (await getItemName(itemId)) || `item ${itemId}`;
      const target = { boardId, itemId, name: itemName };

      logActivity({
        actorId: actor.id,
        actorName: actor.name,
        boardId,
        boardName: board.name,
        itemId,
        itemName,
        actionType: "Commented",
        description: `${actor.name} added a comment on ${itemName}`,
        raw: { boardId, itemId },
      });

      notifyMentions({ mentionIds: extractMentionIds(text), actor, target, link: board.link(itemId) });
    } catch (err) {
      console.error(err);

      if (!res.headersSent) {
        res.status(502).json({ error: "Failed to post the message." });
      }
    }
  });
}
