---
name: jotform-step3
description: BUILT 2026-10-01 (uncommitted) - UAE form, Reference Check, contracts handlers + 30-min safety net; decisions; watch-mode dev server caveat
metadata:
  type: project
---

Plan, decisions, notes: `docs/jotform-step3.md` (don't re-ask). Code: `server/jotform/secondStage/` (shared second-stage machinery, UK/US form moved onto it), `jotform/uae/`, `jotform/referenceCheck/` + `server/referenceChecks/` (table reference_checks, GET /api/applications/:id/reference-checks, References tab cards), `jotform/contract/`, `jotform/poll.js` (every 30 min, 48 h look-back). 39 UAE columns + Adoption Fee created; board 179 columns.

State 2026-10-01: 21 stored UAE forms applied (11 processed, 10 unmatched; bells went to the Admin because the local dev server applied them). Handlers tested on test app 3253079523; NOT tested: contract -> Approved and microchip cat link. Webhooks for Reference Check + both contracts NOT yet added on Jotform (user does it). Re-received submissions are re-handled only when their ANSWERS change (submissionsStore.js).

Incident: an early poll version created 4 applications (Pre-Adoption 4-19 Aug); user chose to KEEP them.

**Why:** the app follows Jotform's process (see [[jotform-backfill]]).

**How to apply:** the user's `npm run dev:all` runs in watch mode against the shared DB: editing an imported server file restarts it and runs startup jobs (waiting submissions, the safety net). Write new modules first, wire them in last, and never wire a job before it's safe. Related: [[jotform-workflows]], [[adoption-form-import]]
