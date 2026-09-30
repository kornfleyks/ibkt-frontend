---
name: assigned-volunteer
description: BUILT 2026-09-30 - Assigned Volunteer is a Users link column (board_relation_mm7pz26f), Active Volunteers only, Admin + Case Owner edit, bell notification
metadata:
  type: project
---

Decisions (user, 2026-09-30, don't re-ask): Assigned Volunteer became a Users link column like Case Owner; old text column `text_mm48zfbv` renamed "Assigned Volunteer (old)" and kept (it was empty on all 11 applications, so no migration); pick list = Active users with role Volunteer; editable by Admins and the application's Case Owner (applicationAccess guard); volunteer notified (new Notification types "Volunteer Assigned" / "Volunteer Unassigned", labels created on first send); Adoptions detail page shows it read-only.

Done: Monday column created + `databaseSchema.js --refresh` run; server `assignedVolunteer.js` (volunteer-options, assigned-volunteer), shared `writeApplicationUserLink` in caseOwner.js; generic update and /api/monday proxy refuse the column; Overview picker; Postman + README. Rule checks passed without writing. NOT yet done: a real assignment through the UI (would notify the one live Volunteer).

**Why:** the user wanted real volunteer assignment instead of free text.

**How to apply:** change Assigned Volunteer only through `/api/applications/:id/assigned-volunteer`. Related: [[postman-collection-upkeep]], [[send-adoption-form]]
