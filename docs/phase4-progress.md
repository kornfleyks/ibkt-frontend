# Phase 4 progress (working notes)

Goal (user, 2026-09-28): move every board and function to the database, then switch them all on. Delete this file when Phase 4 is done.

## Decisions (user)
- One module per board, like Tasks (`server/<board>.js` + `server/database/<board>Store.js`, app-shaped records); the frontend keeps its Monday code beside it and follows `GET /api/database-boards`.
- Same access rules as today everywhere.
- New records that others link to (cats, tasks, users) still get their Monday item at once (1 call, D2); messages, notifications and log entries are created in the database and reach Monday in the nightly sync.
- Passwords and sign-in tokens: stored in the database AND still copied to Monday nightly.
- Files stay on Monday; after an upload or delete the server re-reads that file column (1 Monday call) into the database.
- Communications messages: saved in the database, posted to Monday in the nightly sync.
- Applications / Travel / Post-Adoption / Rescuers are only test data so far (no outside source creates them).

## Shared building blocks
- [x] Two-way link pairs kept in step in the database (only the changed side goes to Monday):
  application Linked Cat (mm4852qa) / cat Linked Adopter (mm48ar6q);
  application Travel (mm482g9z) / travel Linked Adopter (mm486b2n);
  application Post-Adoption (mm49xt5w) / post-adoption Linked Adopter (mm497ap1);
  cat Linked Rescuer (mm474v6b) / rescuer link to Cats (mm48rqcz);
  cat Travel (mm481sxw) / travel Linked Cat (mm48vpn9);
  cat Post-Adoption (mm49kxgg) / post-adoption Linked Cat (mm493c3r).
- [x] File columns copied into the database (read-only copy, never synced) + refresh after upload/delete.
- [x] Users secret columns (password hash, tokens) in the database; never returned by any endpoint.
- [x] Column settings (e.g. Linked Cat allows multiple) available without Monday.
- [x] Sync: posts (create_update) get their Monday update id swapped in.

## Boards
- [x] 4.1 Tasks (built, not switched on)
- [x] 4.2 Cats (server/cats.js; frontend CatsService)
- [x] 4.3 Communications (server/communications.js; messages local until the sync)
- [x] 4.4 Files and photos (fileCopies.js; upload + file delete refresh the copy)
- [x] 4.5 Applications / Adoptions (server/applications.js)
- [x] 4.6 Matching and Case Owner (store keeps Linked Adopter in step; caseOwner.js + userAdmin hand-over)
- [x] 4.7 Travel, Post-Adoption, Rescuers (server/readOnlyBoards.js)
- [x] 4.8 Users, sign-in, accounts (usersStore.js, auth.js, accountState.js, users.js, userAdmin.js; webhooks ignored when on)

## Testing
- [x] Offline test of 4.2-4.8: 35/35 passed, row counts identical before and after

## Switch-on (after all built and tested)
- [x] Schema script (new columns) applied
- [x] Fresh copy (1 call, 2026-09-28, switch overridden for the run): 3/3 users have passwords, file columns filled
- [x] Pushed 10ad390; DATABASE_BOARDS with every board on Render and locally (user)
- [ ] Browser check of every page

## Notes
- Shared: database/boardRecords.js (field specs -> records, checked writes, logging), columnText.js, fileCopies.js; schema applied (new file + secret columns, monday_columns.settings).
- Proxy now refuses reads AND writes naming a switched-on board (file changes excepted, then refreshed) - /api/monday and /api/monday/batch.
