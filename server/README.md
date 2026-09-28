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

## Database mirror (Supabase trial, `database/`)

Monday stays the source of truth; a Supabase Postgres database keeps a copy
of the data (not files) so we can see how much space and how many requests
a database would need. Optional: without `DATABASE_URL` nothing changes.

- `DATABASE_URL` in `.env` (and on Render): Supabase **pooler** connection
  string (user `postgres.<ref>`, host `…pooler.supabase.com`). Keep the
  password letters and numbers only.
- Structure = Monday's: one table per board, one column per Monday column
  (snake_case titles), mapped in `monday_columns`; Communications threads go
  to `communications`. Files, mirror columns and subitems aren't copied, nor
  the Users password hash / login and reset tokens. Row-level security is
  on, so only this server's connection can read the tables.
- `node scripts/databaseSchema.js` creates / updates the tables from Monday's
  live column lists (1 Monday call; re-run after adding Monday columns).
- `node scripts/databaseBackfill.js` copies the current data once (1 Monday
  call for all boards; re-runnable, rows are upserted).
- Live: every mutation Monday accepts is replayed onto the database from the
  request itself (`database/mirror.js`, hooked into `mondayFetch`) - no extra
  Monday calls, covers every server write. Failures are only logged.
- `GET /api/admin/database-health` (Admin) - size vs 500 MB, rows/space per
  table, queries today, mirror status - shown on App Settings.
- Full detail (database-first plan, `docs/database-migration-plan.md`):
  companion columns keep what Monday needs back (`<date>_time`,
  `<country>_code`, `<phone>_country`, `<email>_text`); status/dropdown
  options are in `column_options`. `mondaySchema.js` converts both ways.
  The schema script saves Monday's column list in `.cache/` (git-ignored),
  so re-runs need no Monday call; `--refresh` reads Monday again.
- Store and endpoints (not used by any page yet): `database/boardStore.js`
  reads/writes any board and queues each change for Monday in
  `monday_outbox`, in the same transaction. `/api/data/<board>` (list, get,
  create, update, delete; Admin-only) answers only for boards listed in
  `DATABASE_BOARDS` (comma-separated, per server, empty by default).
- Nightly sync to Monday (`database/sync.js`): sends `monday_outbox` to
  Monday - changes merged per item, 20 per request, marked sent only when
  Monday confirms, up to 5 tries (then "failed" and one admin
  notification), deleted records archived. One run at a time across
  servers (`sync_lock`); a missed night is caught up on start. Its own
  requests carry `# ibkt-sync` so the mirror doesn't copy them back.
  - `SYNC_ENABLED=true` turns the schedule on (set it on Render only, so
    local servers don't also run it); `SYNC_TIME_UTC` (default `00:30`);
    `SYNC_MAX_CALLS` Monday calls per run (default 50).
  - New records: the Monday item is created at once (1 call) with a key in
    its "DB ID" column (`pending_creations`), so an interrupted creation is
    found by the next sync instead of duplicated. The columns were added by
    `node scripts/createDbIdColumns.js` (done; re-running costs nothing).
  - `GET /api/admin/sync` (status, failures) and `POST /api/admin/sync/run`
    (Admin) - the Monday Sync card on App Settings.
- The server's own boards (Phase 3), each behind `DATABASE_BOARDS`
  (`database/switches.js`); switched off they still use Monday:
  - `app_settings`: `GET /api/settings` (signed in, from memory) and
    `POST /api/admin/settings` `{ key, value, name?, description? }`
    (Admins; logged).
  - `notifications`: same `/api/notifications` endpoints; ids are the
    record key (a UUID) so they survive the sync.
  - `activity_log`: entries saved at once (no 10-second batch);
    `GET /api/activity` (signed in; `?boardId=&itemId=` for one item).
  - New rows on these boards get a temporary negative id and no Monday
    call (`createLocalItem`); the sync creates their Monday items.
  - With any board switched on, old values and item names for the log
    come from the database copy (`isCopyTrusted`), not Monday.
  - The generic `/api/monday` route refuses changes to switched-on boards,
    and App Settings changes from non-Admins.
  - Switch on only after a fresh full copy, and on both servers together.
    `scripts/databaseBackfill.js` skips switched-on boards (the database
    is their store).
- Pages, board by board (Phase 4). The app asks `GET /api/database-boards`
  (signed in) once per page load and uses the board's endpoints when it's
  on, Monday otherwise.
  - `tasks` (`tasks.js`, `database/tasksStore.js`): `GET /api/tasks`,
    `/api/tasks/title-options`, `/api/tasks/:id`, `POST /api/tasks`
    (1 Monday call: the item; `catId` and/or `applicationId`, at least
    one, for Linked Cat / Linked Adoption), `POST /api/tasks/:id`
    (changes). Owner notifications link to the cat's Tasks tab, else the
    application's. Logs
    changes with old values and notifies owners; hand-over on suspend
    uses the database too.
  - The other boards follow the same pattern: one module per board, with
    its fields declared once (`database/boardRecords.js` turns rows into the
    records the app's mappers made from Monday, checks and saves changes,
    logs old and new values): `cats.js` (`/api/cats`, options, bonded),
    `applications.js` (`/api/applications`; Case Owner stays in
    `caseOwner.js`), `readOnlyBoards.js` (`/api/travel`,
    `/api/post-adoption`, `/api/rescuers`), `users.js` (`/api/users/names`,
    `/api/admin/users`), and `communications.js` (threads and posts; new
    messages reach Monday at the sync). Sign-in, the account state and the
    Account page use `database/usersStore.js` when Users is on; Monday's
    Users webhooks are then ignored.
  - Two-way links (`LINK_PAIRS` in `mondaySchema.js`, e.g. an application's
    Linked Cat and the cat's Linked Adopter): the store keeps the other side
    in step in the database; only the changed side is sent to Monday.
  - Files stay on Monday. Each file column has a read-only copy (names,
    asset ids, links); after an upload (`/api/upload`) or a file delete the
    column is read back from Monday (1 call, `database/fileCopies.js`).
  - Passwords and tokens are stored (and synced to Monday, as chosen) but
    never returned by any endpoint (`SECRET_COLUMN_IDS`).
  - The generic `/api/monday` and `/api/monday/batch` routes refuse reads
    and writes naming a switched-on board (file changes excepted).

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
`src/constants/communicationBoards.js` (Cats and Active Applications). Reading
(`GET /api/communications/:boardId/:itemId`) and posting follow the item's
page: any signed-in user on a cat, only Admins and the Case Owner on an
application (`403` otherwise; `THREAD_ACCESS` in `communications.js`). A
board added after its items were already kept in the database gets its
existing Monday updates with `node scripts/databaseCopyCommunications.js
<table>` (the backfill skips database boards). The server adds the
"[Author - Role]" prefix from the session, keeps only mentions of Active
accounts (tokens `@[Name](userId)`, see `src/utils/mentions.js`) and
notifies them. `GET /api/users/mentionable` lists the Active accounts
(id, name, role) for the @ picker, from memory. `GET
/api/users/:id/profile-card` returns one account's name, role, status, email
and phone for the card shown when an @mention is clicked - any signed-in user
may read it (agreed), and it's served from memory only (no Monday call;
unknown ids are 404). The in-memory email/phone stay current for changes made
through the app; edits made directly on Monday apply at the next restart.

## Contracts (`contracts.js`)

An application's contract files (the Contracts tab). The files stay in the
application's **Contract File** column on Monday; the `file_uploads` table
(created by `scripts/databaseSchema.js`) keeps who really uploaded each one
(name and role), when, its size and type, a document type (`DRAFT`,
`FINAL`, `SIGNED`, `OTHER`, see `src/constants/contractDocumentTypes.js`)
and an optional note. Monday itself only ever sees the service account.
Files added directly on Monday show Monday's own uploader and time.

- `GET /api/applications/:id/contracts` - the files, newest first.
- `POST /api/applications/:id/contracts` - multipart `file` (20MB max),
  `documentType`, `note` (500 characters max). A Draft / Final / Signed
  file sets Draft Contract Generated / Final Contract Sent / Signed
  Contract Received to "Yes" (logged); answers `{ contract, statusChanges }`.
- `DELETE /api/applications/:id/contracts/:assetId` - statuses stay as they are.

Only Admins and the application's Case Owner may use them
(`applicationAccess.js`, shared with Communications). `/api/upload` and
`/api/monday` refuse the Contract File column so this can't be skipped.

## Own account (`account.js`)

Behind the app's Account page (`/account`, Profile and Settings tabs). Every
route acts on the signed-in user's own Users-board row (the id comes from
the session token, never the request), so non-Admins can edit themselves
even though `/api/monday` refuses their Users-board mutations.

- `GET /api/account` - your name, email, phone, role, status, email
  verified, latest sign-in and saved preferences.
- `POST /api/account/profile` with `{ firstName, lastName, phone: { number,
  country } }` - `number` is national (no country code), `country` an ISO
  code from `src/constants/countries.js`; an empty number clears the phone.
- `POST /api/account/email` with `{ newEmail, currentPassword }` - must not
  belong to another account; the new address is marked Email Verified = No
  (no email can be sent to confirm it).
- `POST /api/account/password` with `{ currentPassword, newPassword }` (8+
  characters). Other sessions stay valid until they expire - tokens are
  stateless.
- `POST /api/account/preferences` with `{ preferences }` - replaces the
  saved set; only keys/values known to `src/constants/preferences.js` are
  kept. Needs the Users board **Preferences** column (long text), created
  once with `npm run create:users-preferences-column`; `503` until
  `USERS.COLUMNS.PREFERENCES` is set.

Wrong current passwords count toward the same per-account lockout as
`/api/login` (`loginLockout.js`) and answer `400`, never `401` (which the app
treats as an expired session). Profile and email changes re-issue the session
token with the same sign-in and expiry times, so the name in Activity Log
entries stays current without extending the session. `/api/login` also
returns the saved `preferences`.

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
  `ALLOWED_ORIGIN` (Render sets `PORT` itself, already handled); for the
  database and its nightly sync also `DATABASE_URL` and `SYNC_ENABLED=true`

Once deployed, set the frontend's `VITE_SERVER_URL` (a GitHub Actions
repository *variable*, not a secret - it's just a public URL) to this
service's URL so the production build points at it.
