---
name: stage-cat-rules
description: BUILT 2026-09-30 - what an application's Adoption Stage does to its linked cats (Reserved/Adopted/freed) and the no-going-back rule
metadata:
  type: project
---

Rules (user, 2026-09-30, don't re-ask), in `changeApplication` (server/applications.js, database mode):
- Matched: cats Reserved (Matching page, unchanged).
- Approved: linked cats -> Adopted.
- Rejected (from any stage, incl. after approval): cats freed = unlinked, back to Adoption Ready, Match Confidence cleared (`freeLinkedCats`).
- Archived BEFORE approval: cats freed. Archived from Approved/Completed: cats stay Adopted and linked (user called the opposite a bug).
- Approved can't go back to New/Active: server refuses; Adoptions page hides those options.
- A cat is only changed if it's still linked to that application and in an expected status.

Tested end to end 2026-09-30 on test app 3253079523 + cat "test 1" (3208429095): all correct, both back to start. Also freed "test 1" from archived Application 1 and set unlinked Reserved cat "new test upload" to Adoption Ready (user OK).

Gaps: only when the stage changes through the app (not Monday edits, not Monday-fallback mode); an archived-after-approval application can still be moved to Active (guard checks only Approved).

**How to apply:** stage-related cat logic lives in applications.js (applyStageEffects / freesCats). Related: [[matching-page]], [[application-update-not-guarded]]
