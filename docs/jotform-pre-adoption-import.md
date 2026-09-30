# Jotform import: Pre-Adoption Form submissions become applications

Status: **built** (2026-09-30), not yet deployed to Render.

Built in `server/jotform/preAdoptionFromJotform.js` (conversion), `server/jotform/handlers/preAdoption.js` (the handler, registered as kind `pre_adoption` in `forms.js` / `receive.js`), `processWaitingSubmissions()` (server start) and `scripts/processJotformSubmissions.js [--retry-failed]`. `toApplication()` gained `lenient` and `clearEmpty` options.

Tested 2026-09-30: the 2 stored submissions were imported (by the local dev server's start-up catch-up): 2 applications, New Application, Case Owner unassigned, Jotform ID columns and per-question columns filled, Preview answers saved, no duplicates. **Not yet tested:** an edited submission, and copying photos (neither stored submission had any).

## Where things stand

- The Pre-Adoption Form (`203096212272447`) now sends every submission to the app's webhook (`POST /api/webhooks/jotform/<secret>`). The server fetches the submission from the Jotform API and stores it whole in `jotform_submissions` (status `received`). 2 have arrived so far (2026-09-30).
- Nothing turns them into applications yet: `server/jotform/receive.js` has an empty `HANDLERS` list, so they stay `received`.
- The in-app **Add Application** (docs/add-application-form.md) already converts form answers into application columns (`server/preAdoption/toApplication.js`) and saves the exact answers for **Preview** (`application_form_answers`).

## The plan

A handler for the Pre-Adoption Form that reuses the Add Application code, so both routes give identical applications and Preview works for both from one table.

1. **Convert** the Jotform answers (keyed by question number) into the form's keys (`server/jotform/preAdoptionFromJotform.js`), using the QIDs already in `src/constants/forms/preAdoptionForm.js`:
   - full name `{first, last}` as is; address `addr_line1/addr_line2/city/state/postal` and the country **name** turned into its ISO code;
   - phone `{area, phone}` (no country in Jotform) gets the address country, with a leading trunk `0` or a typed country code removed;
   - checkboxes (arrays), radios, dropdowns, text as is; the old "NA" becomes "N/A";
   - question numbers not in the form (deleted questions Jotform still sends empty, e.g. 179, 201-203) are ignored.
2. **Create the application** with `toApplication()` (same columns and summaries as Add Application), stage New Application, and the Jotform ID columns (Application Form ID, Application Submission ID). 1 Monday call each (about 2 a day).
3. **Save the converted answers** in `application_form_answers` (as Add Application does), so Preview needs no change.
4. **Link** the submission to the application (`jotform_submissions.application_id`, status `processed`).
5. **Lenient**: a Jotform submission is never refused for a missing or odd answer (Jotform already checked its required fields). Only a missing name or email makes it `unmatched` for a person to look at.
6. **Catch-up**: submissions still `received` (the 2 stored ones, or any that arrive while the handler fails) are processed at server start and by `node scripts/processJotformSubmissions.js`.

Not in this step: the UAE Adoption Form & Agreement, the second-stage forms (Adoption Form and References, Reference Check, contracts), and a scheduled check of Jotform for submissions whose webhook never arrived.

## Decisions needed

| # | Question | Decision (2026-09-30) |
|---|---|---|
| D1 | Someone with an **open application** (same email) submits again | **Create another anyway** (unlike Add Application, which refuses it); volunteers merge or reject by hand |
| D2 | Case Owner of an imported application | **Unassigned** |
| D3 | Tell anyone when a Jotform application arrives? | **No notification** (Jotform's email already goes to the team) |
| D4 | Uploaded photos (Jotform-hosted files) | **Copied** into Application Photos (downloaded from Jotform, uploaded to Monday) |
| D5 | The applicant **edits** their submission later | **Update the application**: columns, summaries and Preview take the new answers (a volunteer's edits to those columns are overwritten); new photos are copied |
| D6 | A phone number that can't be converted | **Phone left empty**; the number as typed stays in the saved answers (Preview) |
| D7 | Older Jotform submissions | **None**: only the 2 stored and every new one |
