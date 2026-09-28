import { COMMUNICATION_BOARDS } from "../src/constants/communicationBoards.js";
import { ACTIVE_APPLICATIONS } from "../src/constants/boards/activeApplications.js";
import { extractMentionIds, keepAllowedMentions } from "../src/utils/mentions.js";
import { mondayDirectRequest } from "./mondayClient.js";
import { listActiveAccounts, findKnownAccount, isAccountStateReady, displayNameOf } from "./accountState.js";
import { clearCache } from "./mondayCache.js";
import { logActivity, getItemName } from "./activityLog.js";
import { canAccessApplication } from "./applicationAccess.js";
import { notifyMentions } from "./notifications.js";
import { isDatabaseBoardId } from "./database/switches.js";
import { query } from "./database/db.js";
import { createLocalPost } from "./database/boardStore.js";

// Posting to an item's Communications thread (a Monday update). Goes
// through here rather than the generic proxy so that:
//   - the "[Author - Role]" prefix comes from the real session and can't
//     be faked by the browser,
//   - @mentions are checked against Active accounts before anyone is
//     notified,
//   - the thread's board is known (create_update itself carries no board).
// Works for any board listed in COMMUNICATION_BOARDS.
//
// When the item's board is kept in the database (DATABASE_BOARDS), threads
// are read from and posted to the database (the nightly sync posts new
// messages to Monday), in the same update shape the app reads from Monday.

// A stored message -> { id, text_body, created_at, creator } as Monday answers.
function toUpdate(row) {
  return {
    id: String(row.monday_update_id),
    text_body: row.author ? `[${row.author} - ${row.role ?? ""}] ${row.body ?? ""}` : row.body ?? "",
    created_at: row.monday_created_at ? new Date(row.monday_created_at).toISOString() : null,
    creator: null,
  };
}

const ITEM_ID_PATTERN = /^\d+$/;
const MAX_MESSAGE_LENGTH = 5000;

// Who may read and post on a board's threads, beyond being signed in.
// Boards not listed (Cats) are open to every signed-in user.
const THREAD_ACCESS = {
  [ACTIVE_APPLICATIONS.BOARD_ID]: canAccessApplication,
};

function canUseThread(user, boardId, itemId) {
  const rule = THREAD_ACCESS[boardId];

  return rule ? rule(user, itemId) : true;
}

// The communications board an item is on, or null (create_update carries
// no board id). Asks Monday; only the legacy /api/monday proxy needs it.
export async function communicationBoardOfItem(itemId) {
  const data = await mondayDirectRequest(`query ($itemId: [ID!]) { items(ids: $itemId) { board { id } } }`, {
    itemId: [itemId],
  });
  const boardId = data?.items?.[0]?.board?.id;

  return boardId && COMMUNICATION_BOARDS[boardId] ? String(boardId) : null;
}

export function registerCommunicationRoutes(app, { requireAuth }) {
  // Who can be @mentioned: Active accounts only, id/name/role, from memory.
  app.get("/api/users/mentionable", requireAuth, (req, res) => {
    res.json({ users: listActiveAccounts() });
  });

  // The card shown when someone clicks an @mention: name, role and contact
  // details, visible to every signed-in user (agreed 2026-09-27). From
  // memory only - no Monday call, and unknown ids are simply not found.
  app.get("/api/users/:id/profile-card", requireAuth, (req, res) => {
    const { id } = req.params;

    if (!ITEM_ID_PATTERN.test(id)) {
      return res.status(400).json({ error: "Invalid user id." });
    }

    if (!isAccountStateReady()) {
      return res.status(503).json({ error: "User details are still loading. Try again in a moment." });
    }

    const account = findKnownAccount(id);

    if (!account) {
      return res.status(404).json({ error: "This user no longer exists." });
    }

    res.json({
      user: {
        id,
        name: displayNameOf(account, id),
        role: account.role,
        accountStatus: account.accountStatus,
        email: account.email,
        phone: account.phone,
      },
    });
  });

  // The thread, newest first (as Monday lists updates). Database boards only;
  // otherwise the app reads Monday.
  app.get("/api/communications/:boardId/:itemId", requireAuth, async (req, res) => {
    const { boardId, itemId } = req.params;

    if (!COMMUNICATION_BOARDS[boardId] || !ITEM_ID_PATTERN.test(itemId)) {
      return res.status(400).json({ error: "This item has no communications thread." });
    }

    if (!isDatabaseBoardId(boardId)) {
      return res.status(409).json({ error: "This board is still kept on Monday on this server." });
    }

    try {
      if (!(await canUseThread(req.user, boardId, itemId))) {
        return res.status(403).json({ error: "You can't see this thread." });
      }

      const { rows } = await query(
        "select * from communications where board_id = $1 and monday_item_id = $2 order by monday_created_at desc nulls last, monday_update_id desc limit 200",
        [boardId, Number(itemId)],
      );

      res.json({ updates: rows.map(toUpdate) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load the messages." });
    }
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
      if (!(await canUseThread(req.user, boardId, itemId))) {
        return res.status(403).json({ error: "You can't post on this thread." });
      }

      if (isDatabaseBoardId(boardId)) {
        const row = await createLocalPost({ boardId, itemId, message: text, author: actor.name, role: req.user.role });

        res.json({ update: toUpdate(row) });
      } else {
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
      }

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
