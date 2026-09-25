import { getAccountState, onAccountChange } from "./accountState.js";

// Server-sent events stream per signed-in tab: pushes the user's live
// account state (role / status) the moment it changes, so a role change or
// suspension shows up without the person doing anything. Changes come from
// accountState.js (this server's own writes and Monday webhooks) - no
// Monday requests are made here. Other modules push their own events
// (e.g. notifications.js) through pushToUser.

const HEARTBEAT_MS = 25_000;

// userId -> Set of open responses (one per tab).
const streams = new Map();

function send(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function toPayload(state) {
  return { role: state.role, accountStatus: state.accountStatus };
}

onAccountChange((userId, next) => {
  const open = streams.get(userId);

  if (!open) {
    return;
  }

  for (const res of open) {
    send(res, "account", toPayload(next));

    // Nothing more to say to a signed-out account - the client signs out.
    if (next.accountStatus !== "Active") {
      res.end();
    }
  }
});

// Sends `event` to every open tab of `userId` (e.g. a new notification).
// A user with no open tab simply gets nothing - they load it next visit.
export function pushToUser(userId, event, data) {
  for (const res of streams.get(String(userId)) ?? []) {
    send(res, event, data);
  }
}

export function registerSessionEventRoutes(app, { requireAuth }) {
  // requireAuth already rejects non-Active accounts, so a suspended user
  // can't (re)connect - the client treats that 401 as "signed out".
  app.get("/api/session/events", requireAuth, async (req, res) => {
    const userId = String(req.user.sub);

    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Stop proxies (Render's included) from buffering the stream.
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    if (!streams.has(userId)) {
      streams.set(userId, new Set());
    }
    streams.get(userId).add(res);

    // Current state straight away, so a change made while this tab was
    // reconnecting isn't missed.
    try {
      const state = await getAccountState(userId);

      if (state) {
        send(res, "account", toPayload(state));
      }
    } catch (err) {
      console.error("Session events: initial state lookup failed.", err.message);
    }

    // Comment lines keep idle proxies from closing the connection.
    const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

    req.on("close", () => {
      clearInterval(heartbeat);

      const open = streams.get(userId);
      open?.delete(res);

      if (open?.size === 0) {
        streams.delete(userId);
      }
    });
  });
}
