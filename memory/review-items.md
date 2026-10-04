---
name: review-items
description: BUILT 2026-10-04 - "Client Review" page (/client-review), visible to Super Admins only, a punch-list of questions/flags with a stored answer field
metadata:
  type: project
---

Built on request (2026-10-04, for a client call that day): `server/reviewItems/` (store + routes, `review_items` table, app-only, never sent to Monday), `src/pages/ReviewItems`, `src/services/ReviewItemsService.js`. Route `/client-review` and the nav item were first gated by email (`emails: ["billkifonidis@gmail.com", "support@ittybittykittytails.co.uk"]`) alongside App Settings, then switched the same day to `roles: ["Super Admin"]` once the Super Admin role existed (see [[super-admin-role]]) - same two accounts, cleaner gate, no email list to keep in sync. All three sections, Internal included, are visible to every Super Admin. Server side is Admin-only (satisfied by Super Admin too, not further restricted - any other Admin account could still reach the API directly).

Categories: question (ask the client), flag (things to tell them), internal (to-do, not for the client). Each item has a title, optional detail, a status (open/answered/resolved, auto-bumped to answered when an answer is saved, reopened if the answer is cleared), and an answer/notes field. Seeded 2026-10-04 (`scripts/seedReviewItems.js`) with the 9 items prepared for that call: app-vs-Jotform ownership question, UAE form delivery, Wix DNS access, the Google Drive OAuth token left on the disabled Mask Covers form, Jotform storage over the plan limit, 7 unused forms to confirm deletable, 3 missing webhooks (Reference Check + both contracts), 11 unmatched submissions, and the Users-board role cleanup (internal).

**Why:** the user wanted a durable place to track questions/flags across client calls instead of re-deriving them each time.

**How to apply:** when prepping for another client call, add new items via the page itself (or a one-off script like seedReviewItems.js) rather than just telling the user in chat - that's the point of the page. Related: [[application-update-not-guarded]] (same roles+emails gating pattern as App Settings)
