# Jotform step 3: UAE form, Reference Check, contracts, safety net

Status: **built** (2026-10-01), not committed. UAE forms applied (11 processed, 10 unmatched). Reference Check and contract handlers tested on the test application; the Approved move and the microchip cat link are not tested yet (no open application with a cat). Webhooks for the Reference Check and both contracts still to be added on Jotform. Jotform keeps running the process; the app receives every form (docs/jotform-backfill.md).

## Decisions (2026-10-01)

### UAE Adoption Form & Agreement (`202981102716450`)

| Topic | Decision |
|---|---|
| Questions shared with the UK/US Adoption Form (~30) | **Same columns** (Employer, Veterinarian, Cat Food, ...). An applicant fills one or the other. |
| Questions repeating the Pre-Adoption Form (~10) | **Own "UAE Form ..." columns too**; the Pre-Adoption column keeps its value. |
| UAE-only questions (~25) | New columns. Emirates ID front / back go to the existing **ID Documents** column. |
| Signed agreement | **Signed Contract Received = Yes** when it arrives signed. |
| Vet costs | **Payment Required = AED** (new label) and the amount in a new **Vet Costs (AED)** column. |
| Matching | Same as the UK/US form (link's hidden id `ibktapplicationid` q188, then email, then name); stage New -> Active. |
| No match | **Unmatched + Admin bell.** |

### Reference Check - IBKT (`220642582493458`)

| Topic | Decision |
|---|---|
| Storage | App-only table **reference_checks** (every answer, signature link, date), shown as a card per referee on the References tab; plus the Jotform Reference 1-3 Submission ID columns. No new Monday columns. |
| References Submitted | **Yes at the first reference.** |
| Matching | 1. the referee's own email (q16) matches a referee on an application (Referee 1-3); 2. else the candidate name (q4) matches exactly one open application. Otherwise unmatched + Admin bell. |
| Criminal history = Yes (q10) | **Highlighted on the card only**, no notification. |

### Pet Adoption Contract, England & Wales (`203072984903054`) and Scotland (`220265883187362`)

| Topic | Decision |
|---|---|
| Matching | Adopter email (q4), then adopter name (q3). |
| Volunteer submits it | Final Contract Sent = Yes; stage **New or Active -> Approved** (linked cats -> Adopted); Payment Required = **GBP**, Payment Status = **Pending** (only if empty); fee in a new **Adoption Fee** column. |
| Cat | **Linked by microchip** (q9 / q64 against the cats' Microchip Number) when Linked Cat is empty, before the stage moves (so the cats become Adopted). |
| Adopter signs (an edit) | Signed Contract Received = Yes once a signature (q76 or q23) is there. |

### Safety net

Every **30 minutes**, the server checks each connected form for submissions that are new or changed since it last saw them, and handles them as if the webhook had arrived.

## To do on Jotform (by hand)

Add the webhook (same URL as the Pre-Adoption Form) to **Reference Check - IBKT**, **Pet Adoption Contract - England & Wales only** and **Pet Adoption Contract - Scotland only**.

## Steps

- [x] 1. Second-stage form machinery made generic (`jotform/secondStage/`), UK/US form moved onto it, unchanged behaviour
- [x] 2. UAE question table + columns (script), handler; apply the 21 stored UAE submissions
- [x] 3. Reference Check: table, handler, endpoint, References tab cards
- [x] 4. Contracts: Adoption Fee column, handler (sent / signed, payment, cat by microchip, Approved)
- [x] 5. Safety net (every 30 minutes)
- [x] 6. Tests, Postman, README, memory

## Notes

- 39 UAE columns (board now 179 with Adoption Fee). Only re-received submissions whose **answers** changed are handled again (Jotform moves updated_at without changes).
- Incident 2026-10-01: an early version of the safety net (100 most recent per form, no time window) ran once on the local dev server (watch mode restarted it) and created 4 applications from Pre-Adoption Forms of 4-19 August before the next restart stopped it; one was finished by hand (submission 6616920278468276469, application 3256070255). The user chose to keep the 4. The check now only looks 48 hours back.
- The local `npm run dev:all` (watch mode) restarts on every server file change and runs the startup jobs (waiting submissions, the check): mind it when editing.
