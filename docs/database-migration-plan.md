# Plan: database-first, with a nightly sync to Monday

Status: **Phase 1 done (2026-09-28)**; Phases 2-5 not started. Monday is still the source of truth and Supabase holds a copy (the mirror trial, see `server/README.md`, "Database mirror"), now at full detail.

## 1. Goal

Stop spending Monday's 1,000 daily API calls on everyday use. The app reads and writes a Supabase (Postgres) database; once a night the day's changes are sent to Monday in batches. Files stay in Monday.

```
Today:   browser -> server -> Monday (real copy) -> database (copy, can fall behind)
Target:  browser -> server -> database (real copy) -> nightly -> Monday (copy + files)
```

Expected effect: page loads, searches and refreshes no longer touch Monday. Monday calls come down to new records (1 each), file uploads and views, and the nightly sync (about 10-20 calls on a normal day).

## 2. Decisions already made

| # | Decision |
|---|---|
| D1 | Nobody works in Monday directly and the AI columns are unused, so data flows **one way only**: database -> Monday. Nothing is synced back. |
| D2 | **Monday item IDs stay the app's IDs.** When a record is created, its Monday item is created straight away (1 call) and its ID is used everywhere, so page addresses, links, owners and @mentions keep working. The Monday item also gets a "DB ID" column pointing back. |
| D3 | **Files stay in Monday** for now (uploads and views still go through Monday). Moving videos to Cloudflare R2 is a later, separate decision. |
| D4 | The sync to Monday runs **nightly**. |
| D5 | Database: **Supabase free** (500 MB). Measured need: well under 100 MB a year. |
| D6 | Switch **one board at a time**, each with a way back to Monday. |
| D7 | **Pages get new endpoints** (`/api/data/<board>`) and their data code is rewritten to use them (rather than the server imitating Monday's query format). Cleaner long term; makes Phase 4 larger. |
| D8 | The per-board switch is **`DATABASE_BOARDS` in each server's environment**, not shared settings, because local and Render use the same database. |

## 3. Risks and how the plan handles them

| Risk | Handled by |
|---|---|
| A change never reaches Monday (failure, restart) | Changes are recorded in an **outbox** table in the same database transaction as the change itself; the sync retries until Monday confirms. |
| Duplicate Monday items after a crash mid-sync | Every Monday item carries the database's ID ("DB ID" column); the sync checks before creating. New records get their Monday item at creation time anyway (D2). |
| Links pointing at items Monday doesn't have yet | The sync sends in dependency order: users, rescuers, cats, applications, tasks, then the rest. |
| Two-way links (e.g. Application "Linked Cat" / Cat "Linked Adopter") | The app writes **both sides** in the database; Monday receives both. |
| Values Monday needs but the current copy drops (country code, phone country, date with/without time, dropdown labels containing commas) | Phase 1 redesigns the tables to keep everything Monday needs. |
| More changes in a day than the Monday budget allows | The sync respects a daily call budget and carries the rest to the next night. |
| Monday file links expire | File links are fetched when needed and cached for their lifetime. |
| Supabase free has no proper backups | The nightly Monday sync is itself a backup; Phase 5 adds a nightly database export. |
| Supabase free pauses after 7 days idle | Daily app use and the nightly sync keep it active. |
| Render sleeping when the sync is due | The server keeps itself awake (self-ping); the sync also catches up on the next start if it missed a night. |

## 4. Phases and subtasks

Points use the team scale (1 = ~8h, 2 = ~16h, 3 = ~20h, 4 = ~32h, 5 = ~40h, full delivery cycle). Parent totals are the sum of their subtasks. Per policy, each subtask created in Jira for this work gets the label **AIAssisted**.

### Phase 1 - Foundation (8 points) - DONE 2026-09-28

Delivered: full-detail tables (companion columns for date time, country code, phone country, email text; 33 date columns converted; 280 status/dropdown options in `column_options`), two-way conversion with round-trip tests (`server/database/mondaySchema.js`), the store with outbox writes in the same transaction (`server/database/boardStore.js`), `/api/data/<board>` endpoints behind `DATABASE_BOARDS` (`server/database/dataRoutes.js`), and the `monday_outbox` table. Used 2 Monday calls (column list, full-detail re-copy).

**1.1 Database design for full Monday fidelity - 3 pts**
Rework the tables so every value can be written back to Monday exactly: country code and name, phone number and country, date columns flagged "has time" (date-only stays date-only), dropdowns as real label lists, status labels. Options tables for dropdown/status choices (breeds, colours, task titles, stages) so the app no longer reads Monday column settings. Keeps the current "one table per board" structure and names.
*Done when:* every current Monday column round-trips (database -> Monday format -> database) without loss, checked by automated tests; options tables filled from the existing data.

**1.2 Server data layer - 3 pts**
One module per board on the server that reads and writes the database (the equivalent of today's Monday calls), plus a per-board switch (Monday / database) so boards can move one at a time and move back.
*Done when:* a board can be read and written through the new layer behind its switch, with the switch off by default.

**1.3 Outbox - 2 pts**
Every database change also records "what Monday needs to receive" in an outbox table, in the same transaction, so nothing can be saved without its Monday change being queued.
*Done when:* creating, changing and deleting a record always leaves exactly one matching outbox entry; covered by tests.

### Phase 2 - Nightly sync to Monday (11 points) - DONE 2026-09-28

Delivered: `server/database/sync.js` (outbox merged per item, 20 changes per request, up to 5 tries, daily call budget, one run at a time across servers, catch-up on start, deleted records archived in Monday), record creation that makes the Monday item first with a "DB ID" key and recovers interrupted creations (`boardStore.js`), "DB ID" columns on all 10 boards (`scripts/createDbIdColumns.js`), `GET/POST /api/admin/sync` and the Monday Sync card on App Settings, one admin notification per change that gives up. Tested offline (fake Monday) and live: create, change and delete of a test task reached Monday in 3 calls. Used 4 Monday calls in total.

**2.1 Sync engine - 5 pts**
Nightly job that sends the outbox to Monday: dependency order, many changes per request (aliased mutations), retries with back-off, respects Monday's rate limit and a daily call budget, carries leftovers to the next night, marks entries done only after Monday confirms. Runs on a schedule and on start-up if a night was missed.
*Done when:* a night's changes of each kind (create, update, link, message, delete) land in Monday correctly in test; a forced failure mid-run resumes without losing or repeating anything.

**2.2 Monday items at creation time + DB ID column - 3 pts**
Creating a record creates its Monday item immediately (1 call) and stores the Monday ID; add the "DB ID" column to every mirrored Monday board; the sync looks items up by DB ID before creating, to avoid duplicates.
*Done when:* new records get their Monday ID at creation; a simulated crash between "create in Monday" and "save the ID" does not produce a duplicate.

**2.3 Sync monitoring - 3 pts**
App Settings card for the sync: last run, changes sent, waiting, failed (with reasons), Monday calls used by the sync. Admin alert (bell) if a run fails or entries are stuck.
*Done when:* the card shows real runs; a failing entry raises one admin notification.

### Phase 3 - The server's own boards (7 points)

These don't change any page, and they stop steady Monday usage.

**3.1 App Settings from the database - 2 pts**
*Done when:* settings are read and saved in the database, synced nightly; no Monday reads for settings.

**3.2 Notifications from the database - 3 pts**
Create, list, mark read in the database; live push unchanged.
*Done when:* the bell works with no Monday calls; notifications appear in Monday after the nightly sync.

**3.3 Activity Log from the database - 2 pts**
Log entries written to the database; the "old value" is read from the database instead of Monday (saves one Monday call per save).
*Done when:* Activity Log page and item Activity tabs read from the database; no Monday calls for logging.

### Phase 4 - The pages, board by board (34 points)

Each subtask: rewrite the board's page data code to use `/api/data/<board>` (D7), carry over the board's access rules into the endpoints (they are Admin-only until then), switch it on in `DATABASE_BOARDS`, run it for a few days, then retire its Monday path. Done when the board's pages make no Monday calls except files, and its changes reach Monday nightly.

| # | Subtask | Pts | Notes |
|---|---|---|---|
| 4.1 | Tasks | 4 | Owner links, due dates, task options. |
| 4.2 | Cats | 5 | Largest board; bonded groups; statuses; options (breed, colour). |
| 4.3 | Communications | 3 | Messages as database rows; posted to Monday as updates nightly; @mentions and notifications unchanged. |
| 4.4 | Files and photos | 4 | Uploads still go to Monday on the item created at D2 time; file lists in the database; Monday file links fetched on demand and cached for their lifetime. |
| 4.5 | Applications | 5 | Many long-text fields; stages; stage actions. |
| 4.6 | Matching and Case Owner | 4 | Both sides of two-way links written by the app; case-owner rules unchanged. |
| 4.7 | Travel, Post-Adoption, Rescuers | 4 | Smaller boards, similar pattern. |
| 4.8 | Users and logins | 5 | Last: password hashes and login state move to the database; live role/suspension updates unchanged; Monday webhooks no longer needed. |

### Phase 5 - Tidy up (3 points)

**5.1 Retire and back up - 3 pts**
Remove what is no longer needed (copy-from-Monday mirror, Users webhooks, Monday read caching and batching where unused), add a nightly database export as a backup, update the README and this plan.
*Done when:* no unused Monday read paths remain; a backup file is produced nightly; documentation matches.

### Totals

| Phase | Points |
|---|---|
| 1 Foundation | 8 |
| 2 Nightly sync | 11 |
| 3 Server's own boards | 7 |
| 4 Pages, board by board | 34 |
| 5 Tidy up | 3 |
| **Total** | **63** |

## 5. Rolling out and backing out

- Before switching a board: a final copy of its data from Monday, then its switch moves to the database.
- If anything looks wrong: turn that board's switch back to Monday. Nothing is lost, because every database change is also queued for Monday.
- A short pause on edits (minutes) during each board's switch.

## 6. Out of scope (for later)

- Moving files to Cloudflare R2 (D3).
- Syncing anything from Monday back to the database (D1).
- Importing the Jotform history.
- Using Monday's AI columns or automations.
