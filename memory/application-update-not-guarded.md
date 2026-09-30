---
name: application-update-not-guarded
description: SECURITY gap found 2026-09-30 - POST /api/applications/:id checks only login, not Admin/Case Owner; Matching (all Volunteers) depends on it
metadata:
  type: project
---

`POST /api/applications/:id` (server/applications.js) only requires a login: any signed-in user can change any writable application field (stage, screening, payments, references...). The UI hides it (application page is Admin + Case Owner only), the server doesn't enforce it.

It can't simply get `requireApplicationAccess`: the Matching page (Admin + every Volunteer, AppRoutes `/matching`) saves `linkedCatIds` / `matchConfidence` through the same endpoint for applications the volunteer doesn't own.

**Why:** reported to the user 2026-09-30 while building the References tab; no decision yet.

**How to apply:** a fix needs a per-field rule (e.g. Matching fields for Admin/Volunteer, everything else Admin + Case Owner). Ask before changing it. Related: [[users-board-read-hole]], [[assigned-volunteer]]
