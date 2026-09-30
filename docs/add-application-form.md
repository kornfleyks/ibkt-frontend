# Add Application: in-app copy of the Pre-Adoption Form

Status: in progress (started 2026-09-30).

The Active Applications page's **Add Application** button opens a copy of the client's Jotform **Pre-Adoption Form** (`203096212272447`): same questions, options, required fields, pages and conditional logic. It creates an application in the app only (nothing is sent to Jotform, no Jotform emails).

## Decisions

| Topic | Decision |
|---|---|
| Form source | Built into the app (`src/constants/forms/preAdoptionForm.js`), copied from the live form on 2026-09-30. Jotform edits need a matching code change. |
| Layout | Dialog with the same 5 pages as Jotform, Next / Back; each step checks its required fields. |
| Where answers go | One column per question (25 new columns), plus the existing 1:1 columns, **and** the grouped summary lines in the existing summary columns (Household Information, Existing Pets, Work Schedule, Previous Cat Experience) so the Overview tab, AI review and Matching keep working. |
| Jotform | App only. |
| Duplicates | Blocked: no second *open* application (stage not Rejected / Archived / Completed) for the same email. |
| Case Owner | The Admin / volunteer who fills it in. |
| Stage | New Application. |

## Preview (application page)

A **Preview** button next to Mark Active / Reject (every stage) shows the form with the saved answers, read-only, all 5 pages in one scroll. Add Application saves the exact answers in the app-only table `application_form_answers` (never sent to Monday); `GET /api/applications/:id/pre-adoption-answers` reads them. Applications without saved answers (created before this, or outside the app) get a disabled button with the reason on hover. Uploaded files aren't in the answers; Preview points to the Application Photos column.

## Deliberate differences from Jotform (requested 2026-09-30)

- Step 2: E-mail comes right after the full name (Jotform has it after the phone).
- Step 4, "Has a pet ever gone missing...": the option is **N/A** (Jotform: "NA"). The server turns "NA" into "N/A" for this question, so a Jotform import matches. The Monday column was created with "NA"; the first save adds "N/A" at the nightly sync, and the unused "NA" label can be deleted on the board.

## Conditional logic copied from Jotform

- "What is your friend/relative's name?" (q189) shows only when "How did you hear about us?" (q165) is **Friend/Relative**.
- The contact-consent question (q192) is hidden when the address country is the **UAE**.
- Jotform's other 2 conditions only pick the confirmation email (UAE or not): not applicable.
- "If other, please explain" boxes are always shown, as in Jotform.

## New Active Applications columns (created by `server/scripts/createPreAdoptionColumns.js`)

| Question (QID) | Column | Type |
|---|---|---|
| 165 + 189 How heard (+ friend) | How Heard | text |
| 145 Cats interested in | Cats Interested In | long text |
| 25 How long at address | Time At Address | text |
| 167 Rented / Owned / ... | Home Tenure | status |
| 180 Accommodation | Accommodation Type | status |
| 182 Private garden | Private Garden | status |
| 152 + 171 Activity level (+ other) | Household Activity Level | text |
| 174 People and ages | Household Members | long text |
| 91 Family in agreement | Family In Agreement | status |
| 131 If not, explain | Family Agreement Notes | long text |
| 172 + 173 Pet owner experience (+ other) | Pet Owner Experience | text |
| 186 Current pets | Current Pets | long text |
| 187 Current pets sterilised | Current Pets Sterilised | status |
| 168 Hours alone | Hours Alone | numbers |
| 51 Allergies | Household Allergies | status |
| 52 If yes, describe | Allergy Details | long text |
| 175 + 176 Chief responsibility (+ other) | Chief Carer | text |
| 151 Pet missing / road accident | Pet Lost Before | status |
| 69 Age preference | Age Preference | text |
| 159 Preferences | Cat Preferences | text |
| 93 15-20 year commitment | Lifetime Commitment | status |
| 178 Allowed outside | Outdoor Access | status |
| 177 Typical day | Typical Day | long text |
| 200 Photos | Application Photos | file |
| 192 Contact consent | Contact Consent | text |

Existing columns filled 1:1: Name (q119), Email (q124), Phone (q121), Country / City / Address (q120), Why Adopt (q135), Adoption Motivation (q170 + q153).

## Steps

- [x] 1. Form definition (`src/constants/forms/preAdoptionForm.js`)
- [x] 2. Answers to application columns (`server/preAdoption/toApplication.js`), shared later with the Jotform import
- [x] 3. Column script written (`server/scripts/createPreAdoptionColumns.js`)
- [x] 3b. Ran it (user's go-ahead, 2026-09-30): 25 columns created on Monday; `databaseSchema.js --refresh` added them to the database; all 9 status columns carry the form's options as labels
- [x] 4. Column ids into `src/constants/boards/activeApplications.js`
- [x] 5. `POST /api/applications` (`server/preAdoption/routes.js`): validation, duplicate block, case owner, stage. Answers 503 until step 4.
- [x] 6. Add Application dialog (`src/components/ActiveApplications/AddApplicationDialog/`)
- [x] 7. Button wired; lint and build pass
- [x] 8a. Server tested end to end (2026-09-30): invalid answers -> 400 with field errors; valid -> created "Test Applicant (Claude)" (item 3253079523, New Application, case owner set, per-question and summary columns filled); same email again -> 409 with the existing id
- [ ] 8b. Test the dialog in the browser (steps, conditions, photos)
- [ ] 8c. Delete the test application 3253079523 if the user wants
