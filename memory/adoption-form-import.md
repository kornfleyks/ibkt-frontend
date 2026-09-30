---
name: adoption-form-import
description: BUILT 2026-09-30 - Jotform "Adoption Form and References" handler; 36 new Active Applications columns (every answer stored); decisions; what is untested
metadata:
  type: project
---

Plan, decisions, column list and steps: `docs/jotform-adoption-form-import.md`. Code: `server/jotform/adoptionReferences/` (questions.js = single source for columns + converter; toApplicationChanges.js; handler.js), shared `server/jotform/uploads.js` (Pre-Adoption photos use it too).

Decisions (user, 2026-09-30, don't re-ask): store EVERY answer in its own column ("I don't want to lose anything"); repeats of Pre-Adoption questions get own "Adoption Form ..." columns too, existing Phone/Country/City/Address/Referee 1-2 filled only if empty; summary lines added in a replaceable section; ID uploads COPIED to Monday "ID Documents" (file_mm7pgrjp, protected column); edits re-applied. Match order: already linked, hidden ibktapplicationid, email, exact name; unmatched = Admin bell (new type "Unmatched Submission").

Done: 36 columns created on Monday + schema refreshed (board now 139 columns). Tested on test application 3253079523 with made-up submission 900000000000000001 (first + edit): correct. The test app now holds made-up AF answers. NOT tested: ID file copy, unmatched path. Not committed/pushed at time of writing.

**Why:** second-stage form data used to live only in Jotform.

**How to apply:** when the client edits that Jotform form, update questions.js (+ run the column script). Related: [[send-adoption-form]], [[postman-collection-upkeep]]
