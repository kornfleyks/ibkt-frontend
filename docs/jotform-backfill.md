# Bringing current Jotform applicants into the app, and automatic stages

Status: **import done** (2026-10-01); code not yet committed.

Jotform keeps running the process (forms, workflows, approvals, emails). The app follows it: it receives every form and moves the Adoption Stage on the milestones it can see. Jotform's API shows which submissions wait at an approval, but not the step or the button clicked (checked 2026-09-30), so calls, video, declines and withdrawals stay manual in the app.

## Decisions (2026-10-01)

| Topic | Decision |
|---|---|
| Automatic stages | **Adoption Form (UK/US or UAE) arrives**: New -> Active. **Contract issued by a volunteer**: -> Approved (linked cats become Adopted). Reference Check: References Submitted = Yes only. Signed contract: its field only. Completed: manual. |
| Safety | Never moves a stage backwards; never touches an application that is Approved, Rejected, Archived or Completed (except Active -> Approved for a contract). |
| Declines / withdrawals / fostering | By hand in the app (Reject / Archive). |
| Import: Pre-Adoption Forms | Submitted in the last **6 weeks** (about 91), created as New. |
| Import: Adoption Forms | Submitted in the last **6 months** (24 UK/US, 21 UAE). Each one's applicant's Pre-Adoption Form (same email, any date in the last 13 months) is imported first, then the Adoption Form is applied (stage -> Active). UAE forms are stored and applied once their handler exists. |
| Unmatched during the import | No bell per submission; one summary at the end. |
| Duplicates | Same rule as live: a second Pre-Adoption by the same email creates another application (D1). Submissions already in the app are skipped. |

## How

- `scripts/importJotformSubmissions.js [--apply]`: dry run by default (lists what would be imported, the Monday calls it will cost and today's Monday usage); `--apply` imports through the same path as the webhook (`receiveSubmission`, via `backfill`), oldest first: Pre-Adoption Forms, then Adoption Forms, then UAE forms.
- `quiet` option through `receiveSubmission` -> handler: suppresses the unmatched bell.
- Adoption Form handler: after applying, New -> Active (logged like any change).
- Contract milestone: in the contracts handler, when it is built.

## Steps

- [x] 1. Adoption Form handler: New -> Active
- [x] 2. `quiet` option (no unmatched bells)
- [x] 3. Import script with dry run
- [x] 4. Dry run 2026-10-01: 120 Pre-Adoption (89 recent + 31 for an Adoption Form), 24 Adoption Forms (1 without a Pre-Adoption), 21 UAE stored, 195 photos + 37 ID files, about 414 Monday calls; user chose to import everything at once
- [x] 5. `--apply` run 2026-10-01: 143 applied (120 Pre-Adoption, 23 Adoption Forms), 21 UAE stored, 1 unmatched (Adoption Form 6570987098916984192, no Pre-Adoption by that email), 0 failed. Applications now 132: 101 New, 24 Active, 7 Archived. Photos on 41, ID files on 20.
- [x] 6. README, memory
