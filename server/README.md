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
  Mutations always bypass the cache and clear it afterwards, since a
  mutation can change data behind more than one cached read. A caller can
  request a longer TTL for a specific query via `cacheTtlMs` in the request
  body (used for `getColumnSettings`, which rarely changes).

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
