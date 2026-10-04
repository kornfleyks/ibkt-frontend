---
name: jotform-backfill
description: 2026-10-01 - Jotform stays the process; app follows it (Adoption Form -> Active, contract -> Approved later); import of current applicants run with --apply
metadata:
  type: project
---

Decisions (user, 2026-10-01, don't re-ask): keep Jotform forms + workflows + approvals; the app follows. Jotform API can't tell the approval step or button clicked, so: milestones automatic (Adoption Form / UAE form arrives: New -> Active; contract issued: -> Approved, to build with the contracts handler; Reference Check: References Submitted only), declines / withdrawals / fostering by hand in the app. Import: Pre-Adoption last 6 weeks + Adoption Forms last 6 months (with their applicants' Pre-Adoption), no unmatched bells (summary instead), everything incl. photos in one run (~414 Monday calls).

State: `scripts/importJotformSubmissions.js --apply` DONE 2026-10-01: 143 applied, 21 UAE stored, 1 unmatched (AF 6570987098916984192), 0 failed (received_via = 'backfill' in jotform_submissions; re-running skips what's stored). Plan/steps: `docs/jotform-backfill.md`. Code not committed at that point.

Useful facts: 382 Pre-Adoption submissions wait at a Jotform approval (`/user/tasks` active_submissions = submission ids), almost all old (only 2 since July 2026).

**How to apply:** check the doc's steps; failed ones retry with `processJotformSubmissions.js --retry-failed`. Related: [[jotform-workflows]], [[adoption-form-import]], [[monday-daily-limit-testing]]
