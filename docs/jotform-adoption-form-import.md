# Jotform import: Adoption Form and References

Status: **built** (2026-09-30), not yet deployed. Tested on the test application (first submission and an edit); not yet tested: ID file copy, the unmatched path (it notifies the Admins).

The **Adoption Form and References** (`211304838746458`, the UK/US second stage) now sends every submission to the webhook, which stores it in `jotform_submissions` (kind `adoption_references`). This adds the handler that applies it to the applicant's existing application. It never creates an application.

## Decisions (2026-09-30)

| Topic | Decision |
|---|---|
| What is stored | **Every answer**, each in its own Active Applications column (36 new columns, created 2026-09-30; board now 139 columns). Nothing is kept only in the submission. |
| Answers that repeat the Pre-Adoption Form (name, email, address, time at address) | Their **own "Adoption Form ..." columns too**, so both versions are visible. The existing Phone / Country / City / Address and Referee 1 / 2 columns are **filled only if empty**. |
| Summary columns (Household Information, Existing Pets, Previous Cat Experience, Work Schedule) | **Lines added** in a section headed `From "Adoption Form and References" (submission <id>):`, below whatever is there; a volunteer's text is never overwritten. |
| ID uploads (q169, q170) | **Copied to Monday**, into a new "ID Documents" file column (downloaded from Jotform, like the Pre-Adoption photos). |
| Edits of a submission | **Re-applied**: the per-question columns take the new answers (cleared answers clear their column), the summary section is replaced (not repeated), new ID files are copied. |
| Finding the application | 1. an application already linked to this submission (an edit); 2. the hidden `ibktapplicationid` (q174) when that application exists; 3. email (q124): the single open application with it (or the single application if none is open); 4. exact full name, single open match. Otherwise `unmatched`. |
| No match | Status `unmatched` and a bell notification to every Active Admin (decided 2026-09-29). |
| Id and email disagree | Applied to the id's application; the Activity log entry says the emails differ. |

## New columns

| QID | Question | Column | Type |
|---|---|---|---|
| 119 | Full name | Adoption Form Name | text |
| 124 | E-mail | Adoption Form Email | text |
| 120 | Home address | Adoption Form Address | long text |
| 25 | How long at this address | Adoption Form Time At Address | text |
| 166 | Which cat | Cat Applying For | text |
| 121 | Home phone | Home Phone | text |
| 122 | Mobile | Mobile Phone | text |
| 28 | Employer name and address | Employer | long text |
| 123 | Work phone | Work Phone | text |
| 30 | Latest time to call | Latest Call Time | text |
| 169 + 170 | ID uploads | ID Documents | file |
| 158 | Two nearest airports | Nearest Airports | text |
| 36 | Can afford the fee | Can Afford Fee | status |
| 147 | Plans to declaw | Plans To Declaw | status |
| 148 | Current cats declawed | Current Cats Declawed | status |
| 126 | Chief responsibility | Chief Responsibility | long text |
| 59 | Pets vaccinated | Pets Vaccinated | status |
| 60 | If not, why | Vaccination Notes | long text |
| 127 | Money for medical care | Medical Budget | long text |
| 66 | Holiday plans | Holiday Plans | long text |
| 75 | Flea / tick prevention | Flea Prevention | status |
| 128 | Veterinarian | Veterinarian | long text |
| 149 + 154 | Behaviour problems (+ other) | Behaviour Plan | long text |
| 150 + 155 | Litter problems (+ other) | Litter Problem Plan | long text |
| 129 | Cat food | Cat Food | long text |
| 94 | Home visits | Home Visits Allowed | status |
| 95 | Cruelty charge | Cruelty Charge | status |
| 132 | If yes, describe | Cruelty Details | long text |
| 97 | Adopted before | Adopted Before | status |
| 133 + 134 | Rescue name and phone | Previous Rescue | text |
| 100 | Where the cat spends its time | Cat Living Area | status |
| 156 | Supervised outdoors | Outdoor Supervised | status |
| 138 | Where the cat eats | Where Cat Eats | long text |
| 139 | Where the cat sleeps | Where Cat Sleeps | long text |
| 109 + 142 + 173 | Reference #3 | Referee 3 | text |
| 143 | Anything else | Anything Else | long text |

Existing columns: Referee 1 / Referee 2 (q107/140/171, q108/141/172, `Name, phone, email`, only if empty), Phone / Country / City / Address (only if empty), Jotform Adoption Form Form ID / Submission ID (always). q160 is a social-media widget (no answer); q174 is the hidden application id.

## Steps

- [x] 1. Question table (`server/jotform/adoptionReferences/questions.js`): QID, key, column, type, options
- [x] 2. Column script `scripts/createAdoptionFormColumns.js` run (36 created), ids in `activeApplications.js`, `databaseSchema.js --refresh` run
- [x] 3. Conversion (`toApplicationChanges.js`): own columns, fill-if-empty, summary section, file URLs
- [x] 4. Handler (`handler.js`): matching, write, ID files, Jotform ID columns, answers saved, Activity log, unmatched + Admin bell; registered in `receive.js`
- [x] 5. Shared Jotform upload copy (`jotform/uploads.js`), used by the Pre-Adoption handler too; ID Documents protected like other file columns
- [x] 6. Converter tested with made-up answers; handler tested on "Test Applicant (Claude)" (3253079523) with a made-up submission 900000000000000001 (first + edit). No real submissions waiting yet.
- [x] 7. README, memory

## Notes

- The summary section ends at the first blank line. A volunteer who types directly under the section heading (no blank line) has that text treated as part of the section, and it is replaced on an edit.
- On an edit the section moves to the end of the summary column.
- The test application 3253079523 now carries the made-up Adoption Form answers (they reach Monday at the nightly sync).
- ID Documents is protected like the other file columns (`/api/upload` and `/api/monday` refuse it).
