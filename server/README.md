# IBKT Server

Small Express server the frontend talks to instead of calling Monday.com
directly. It holds the Monday API token server-side and does two things:

- Proxies every Monday GraphQL request (`POST /api/monday`), so the token is
  never shipped to the browser. A public GitHub Pages build has no way to
  keep a token secret otherwise - anyone can read a bundled JS file.
- Proxies file uploads (`POST /api/upload`) to Monday's `/v2/file` endpoint,
  which doesn't send CORS headers and so can't be called from a browser at
  all.
- Caches Monday query results in memory (`mondayCache.js`) for however long
  the `MONDAY_CACHE_TTL_SECONDS` App Settings row says (default 60s, read
  via `appSettings.js`), shared across every client hitting this server.
  Mutations bypass the cache. Cached reads are tagged with the boards they
  name, so a change clears only that board and the boards linked to it
  (`boardRelations.js`, derived from each board's `RELATIONS`); reads with
  no board (items/updates by id) and mutations that name no board clear
  conservatively. A caller can request a longer TTL for a specific query
  via `cacheTtlMs` in the request body (used for `getColumnSettings`,
  which rarely changes).
- Keeps Monday requests down (Monday's daily limit counts requests, not
  their size), in `mondayReads.js`:
  - the app groups the reads it makes within 10ms (typically a whole page
    load) and sends them to `POST /api/monday/batch` (up to 25 reads);
  - a read identical to one already on its way to Monday waits for that
    answer instead of making its own call (across all users);
  - the remaining reads of a batch are merged into ONE Monday request
    (variables renamed, top-level fields aliased, answer split back). If
    Monday rejects the merged request, each read is retried on its own.
  - Activity Log entries are buffered and written together every 10s (one
    request of aliased `create_item`s, up to 25 per request); a normal stop
    (SIGTERM/SIGINT) flushes them first, a crash loses what's buffered.
  - App Settings are re-read at most every 10 minutes (saves through the app
    apply at once); simultaneous reloads share one call.
- Health and keep-alive (`serverHealth.js`, no Monday calls): `GET
  /api/health` is public and answers `{ "ok": true }`. On Render
  (`RENDER_EXTERNAL_URL`, set automatically; `KEEP_ALIVE_URL` overrides it)
  the server calls its own public `/api/health` every 10 minutes so the free
  plan doesn't put it to sleep; locally it's off. It can't wake itself once
  asleep - the next visit or deploy does. `GET /api/admin/server-health`
  (Admin) returns uptime, start time, the self-ping's last result and
  memory, shown on App Settings.
- Tracks today's Monday usage (`mondayUsage.js`, `mondayUsageSync.js`): on
  start it reads Monday's daily limit and today's official usage once, then
  adds every call it makes (per UTC day, also saved to `.monday-usage.json`).
  Admins get it on every response (`X-Monday-Usage: used/limit`, plus
  `X-Monday-Blocked-For` seconds while Monday returns 429); App Settings
  shows it always, the sidebar in development (`APP_ENV=development`).
- Respects Monday's rate limit (`mondayRateLimit.js`): every Monday call goes
  through `mondayFetch`. On a 429 it pauses all Monday calls until Monday's
  `Retry-After`, failing fast meanwhile; `/api/monday` and `/api/upload`
  answer 429 with a readable message ("Monday's API limit has been reached.
  Try again in about 5 hours."). The startup user load retries with backoff
  instead of every 30s.

## Case Owner (`caseOwner.js`)

An application's Case Owner (a relation to the Users board) can only be
changed through these endpoints - `/api/monday` refuses any mutation that
mentions the column - so the rules below can't be bypassed:

- `GET /api/users/assignable` - users that can be picked: Active accounts
  whose role is in the `CASE_OWNER_ROLES` App Setting. Returns only
  `id`, `name`, `role`. Callers must be allowed to assign (below).
- `POST /api/applications/:id/case-owner` with `{ "userId": "<id>" | null }`
  - caller's role must be in `CASE_OWNER_ASSIGNER_ROLES`; the user must be
  assignable. Logged to the Activity Log.

Both settings default (see `src/constants/settingDefinitions.js`) to all
roles / Admin only when their App Settings row is missing.

One-off migration of the old free-text column ("Case Owner (Legacy)"):

```
npm run migrate:case-owners            # dry run: report only
npm run migrate:case-owners -- --apply # write the matched rows
```

## Account state and user administration

`requireAuth` checks every request against each account's **live** Status and
Role, held in memory (`accountState.js`) - so a suspension or role change
applies on the next request, without asking Monday each time. The memory is
filled by one Users-board read at startup and kept current by:

- this server's own writes (`POST /api/admin/users/:id/status`, role changes
  proxied through `/api/monday`);
- Monday webhooks for edits made directly on the board (`webhooks.js`).

Admin endpoints (`userAdmin.js`):

- `GET /api/admin/users/:id/open-work` - the user's open cases (any stage
  but Rejected/Archived/Completed) and open tasks (New/In Progress/Waiting).
- `POST /api/admin/users/:id/status` with `{ "status": "..." }` - Suspend and
  Archive first reassign that open work to the acting Admin (each move is
  activity-logged); you can't change your own status. `/api/monday` refuses
  direct writes to Account Status so this can't be skipped.

Signed-in tabs hold `GET /api/session/events` open (server-sent events,
auth in the header). Every change applied to the account state is pushed
to that user's tabs straight away (`sessionEvents.js`), so a role change or
suspension takes effect without them clicking anything; a heartbeat every
25s keeps proxies from closing the stream, and the app reconnects on drops.

Webhooks need a **public** URL (Monday can't reach localhost). Once deployed,
set `MONDAY_WEBHOOK_SECRET` and run once:

```
npm run register:users-webhooks -- https://your-public-server.example.com
```

Until then, edits made directly on Monday are picked up at the next restart.

## Notifications (`notifications.js`) and Communications (`communications.js`)

In-app notifications are rows on the Monday **Notifications** board
(`src/constants/boards/notifications.js`, created once with
`node scripts/createNotificationsBoard.js <workspaceId>`). They are created
here when, through this server:

- a task is created with an owner, or its Owner changes (detected on the
  `/api/monday` proxy): the new owner gets "assigned", the old one "taken off";
- a Case Owner changes (`POST /api/applications/:id/case-owner`), same rule;
- someone is @mentioned in a Communications post.

Nobody is notified about their own action, and only Active accounts are.
Each new notification is pushed to the recipient's open tabs over
`/api/session/events` (event `notification`). Changes made directly on
Monday don't notify.

- `GET /api/notifications` - your latest 30 (newest first) and unread count.
- `POST /api/notifications/:id/read` - mark one of yours read.
- `POST /api/notifications/read-all` - mark all of yours read.

`/api/monday` refuses any request naming the Notifications board, so people
only see their own (best-effort, like the other board guards).

Communications posts go through `POST /api/communications/:boardId/:itemId`
with `{ "text": "..." }`, for boards listed in
`src/constants/communicationBoards.js` (Cats today). The server adds the
"[Author - Role]" prefix from the session, keeps only mentions of Active
accounts (tokens `@[Name](userId)`, see `src/utils/mentions.js`) and
notifies them. `GET /api/users/mentionable` lists the Active accounts
(id, name, role) for the @ picker, from memory.

## Monday API version (`mondayApiVersion.js`, `mondayApiVersionCheck.js`)

Every Monday request the server makes carries an `API-Version` header, so
Monday's quarterly releases never change behaviour unannounced. The version
is the **Monday API Version** App Setting (`MONDAY_API_VERSION`, e.g.
`2026-07`); until it loads, or if it's missing/invalid, the default in
`src/constants/mondayApiVersion.js` applies. Saving it on App Settings
applies it to the next request.

Once at startup and then daily, the server asks Monday for its version list
(one call) and compares the pinned version:

- **update due** - pinned version is in maintenance (a newer one is current);
- **deprecated** - urgent: Monday serves requests to it with another version.

In either case every Active Admin gets one bell notification per version and
status (read back from the Notifications board, so restarts don't resend it),
the Dashboard shows a banner to Admins, and App Settings shows the status next
to the setting. `GET /api/admin/monday-api-version` (Admin only) returns the
status. To update: read Monday's release notes for the new version, test, then
change the setting.

## Setup

```
cd server
npm install
cp .env.example .env   # then fill in your Monday API token
npm start
```

Runs on `http://localhost:4000` by default. The frontend's `.env` needs
`VITE_SERVER_URL` pointing at wherever this is running (already set to
`http://localhost:4000` for local dev).

`ALLOWED_ORIGIN` in `.env` is a comma-separated list of origins allowed to
call this server - it must include whatever the frontend is actually served
from (the local Vite dev server, and the deployed GitHub Pages origin).

## Deployment

This needs to run somewhere persistent (GitHub Pages only serves static
files, and GitHub Actions runners aren't meant to host a long-running
service). Deploy this folder as its own service - e.g. on Render:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables: `MONDAY_API_TOKEN`, `MONDAY_API_URL`,
  `ALLOWED_ORIGIN` (Render sets `PORT` itself, already handled)

Once deployed, set the frontend's `VITE_SERVER_URL` (a GitHub Actions
repository *variable*, not a secret - it's just a public URL) to this
service's URL so the production build points at it.
