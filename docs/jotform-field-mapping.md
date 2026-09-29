# Jotform to database: field mapping (draft for review)

Status: **draft, 2026-09-29**. Nothing here is built yet. Once agreed, this is the specification for the form handlers in `server/jotform/`.

Form fields are identified by their Jotform **QID** (stable when the client edits a label). Database columns are in the `applications` table (Monday board "Active Applications"); changes reach Monday in the nightly sync, as for every other change in the app.

## 1. Which form goes to which table

| Form | Uses in the last year | Table | What happens | How the application is found |
|---|---|---|---|---|
| Pre-Adoption Form | 599 | `applications` | **Creates** an application | - (new) |
| UAE Adoption Form & Agreement | 31 | `applications` | **Creates** an application | - (new) |
| Adoption Form and References | 45 | `applications` | **Updates** the applicant's application | Email (q124), then full name (q119) |
| Reference Check - IBKT | 148 | `applications` | **Updates** the candidate's application | Referee's email (q16) matching a referee email given in "Adoption Form and References", then candidate name (q4) |
| Pet Adoption Contract - England & Wales / Scotland | 49 | `applications` | **Updates**: contract sent, then contract signed | Adopter email (q4), then adopter name (q3) |
| Foster Agreement, IBKT Foster Compliance & Safeguarding, Cat Passport, Kitty Profile For Rehoming, Pet Surrender Form | 287 | `jotform_submissions` only | Kept, nothing applied (your decision) | - |

**Every** submission, mapped or not, is kept whole in `jotform_submissions`. Answers without a column below are not lost: they can be shown on the application page ("Form answers") and given to the AI form review.

When a later form finds **no** application, the submission is marked `unmatched` and Admins get a bell notification (your decision).

### Jotform ID columns (added 2026-09-29)

Each application records which Jotform form and submission each part came from, in 10 text columns (on Monday and in the database). Only the Jotform handlers write them; nobody edits them in the app.

| Set by | Form ID column | Submission ID column(s) |
|---|---|---|
| Pre-Adoption or UAE form (creates the application) | `jotform_application_form_id` | `jotform_application_submission_id` |
| Adoption Form and References | `jotform_adoption_form_form_id` | `jotform_adoption_form_submission_id` |
| Reference Check | `jotform_reference_form_id` | `jotform_reference_1_submission_id`, `_2_`, `_3_` (in the order they arrive) |
| Contract (E&W, Scotland or USA) | `jotform_contract_form_id` | `jotform_contract_submission_id` |

Monday titles are the same words, starting with "Jotform" (for example "Jotform Reference 1 Submission ID").

- The handlers also use these to recognize a submission they've already applied: an edited Pre-Adoption submission updates *its* application instead of creating a second one.
- A 4th reference for the same application has no column: it is still applied (Reference Notes) and kept in `jotform_submissions`.
- If the same form type arrives twice for one application (for example a second contract), the columns keep the first (proposed, D8); the later one is still applied and kept.

## 2. General rules (proposed)

- **Long-text summary columns** (Household Information, Existing Pets, ...) collect several questions as `Question: answer` lines, skipping empty answers. "If other / if yes, please explain" answers go on the same line as their question.
- **Checkbox answers** (several ticked) are joined with commas.
- **Name** of the application = the applicant's full name, `First Last`.
- **Later forms never overwrite** what a volunteer has typed: they fill empty fields, and **add** their lines to long-text columns under a heading such as `From "Adoption Form and References" (2026-09-29):`. (Decision D1.)
- **Edits** of a submission (for example the applicant corrects an answer) re-apply that form's values; the added section for that submission is replaced, not repeated.
- **Files and signatures** stay in Jotform; nothing is copied to Monday (no Monday calls, no storage).

## 3. Pre-Adoption Form (`203096212272447`): creates an application

| QID | Jotform question | App field | DB column | How |
|---|---|---|---|---|
| 119 | Your Full Name | name | `name` | `First Last` |
| 124 | E-mail | email | `email` (+ `email_text`) | as given |
| 121 | Phone Number | phone | `phone` (+ `phone_country`) | area + number; phone country from the address country |
| 120 | Your Home Address | country | `country` (+ `country_code`) | country name converted to its 2-letter code |
| 120 | Your Home Address | city | `city` | city part |
| 120 | Your Home Address | address | `address` | all address lines |
| - | (date submitted) | applicationDate | `application_date` | Jotform's submission date |
| - | - | adoptionStage | `adoption_stage` | always "New Application" |
| 135 | Why are you choosing to adopt vs. buying from a pet store or breeder? | whyAdopt | `why_adopt` | as given |
| 170 + 153 | Reason for wanting to adopt (+ other) | adoptionMotivation | `adoption_motivation` | ticked reasons, plus the explanation |
| 172 + 173 | Experience as a pet owner (+ other) | previousCatExperience | `pervious_cat_experience` | line |
| 151 | Has a pet ever gone missing or been killed in a road accident? | previousCatExperience | `pervious_cat_experience` | line |
| 167 | Rented / Owned / Living with parents / Shared | householdInformation | `household_information` | line |
| 180 | Accommodation (House / Apartment / Studio) | householdInformation | `household_information` | line |
| 182 | Access to a private garden | householdInformation | `household_information` | line |
| 25 | How long have you lived at this address? | householdInformation | `household_information` | line |
| 174 | All people and their ages living with the pet | householdInformation | `household_information` | line |
| 91 + 131 | Whole family in agreement (+ explanation) | householdInformation | `household_information` | line |
| 51 + 52 | Allergies in the household (+ details) | householdInformation | `household_information` | line |
| 152 + 171 | Household activity level (+ other) | householdInformation | `household_information` | line |
| 175 + 176 | Who will have chief responsibility (+ other) | householdInformation | `household_information` | line |
| 178 | Will your pet be allowed outside? | householdInformation | `household_information` | line |
| 186 | Pets currently living with you | existingPets | `existing_pets` | line |
| 187 | Are your current pets sterilised? | existingPets | `existing_pets` | line |
| 168 | Hours the pet will be left alone | workSchedule | `work_schedule` | line |
| 177 | Your typical day | workSchedule | `work_schedule` | line |

**No column today** (kept in the submission only, unless decided otherwise in D2):

| QID | Question |
|---|---|
| 145 | Which cat(s)/dog(s) are you interested in? |
| 165 + 189 | How did you hear about us? (+ friend's name) |
| 69 | Age of cat/dog you would consider |
| 159 | Preferences (short/long hair, male/female) |
| 93 | Prepared to commit for 15-20 years? |
| 200 | Photos (file upload) |
| 192 | Contact consent (Email / Phone / Text) |

## 4. UAE Adoption Form & Agreement (`202981102716450`): creates an application

| QID | Jotform question | App field | DB column | How |
|---|---|---|---|---|
| 119 | Your Full Name | name | `name` | `First Last` |
| 124 | E-mail | email | `email` | as given |
| 122 (else 121) | Cell Phone Number (else Home) | phone | `phone` | area + number, country from the address |
| 120 | Your Address | country, city, address | `country`, `city`, `address` | as Pre-Adoption |
| - | (date submitted) | applicationDate | `application_date` | submission date |
| - | - | adoptionStage | `adoption_stage` | "New Application" |
| 135 + 136 | Why adopt vs. buying (+ other) | whyAdopt | `why_adopt` | as given |
| 152 + 153 | Reason for wanting to adopt (+ other) | adoptionMotivation | `adoption_motivation` | ticked reasons |
| 54, 55 | Pets owned in the past 5 years, and the list | previousCatExperience | `pervious_cat_experience` | lines |
| 56 + 115 | Owned a cat with your spouse (+ when) | previousCatExperience | `pervious_cat_experience` | line |
| 151 | Ever lost or given away a pet? | previousCatExperience | `pervious_cat_experience` | line |
| 97, 133, 134 | Adopted before (+ rescue name and phone) | previousCatExperience | `pervious_cat_experience` | line |
| 169 | About yourself, your home set-up and experience with pets | householdInformation | `household_information` | first line |
| 43, 160 | Type of dwelling; own your home? | householdInformation | `household_information` | lines |
| 161 + 162 | Garden / balcony (+ letting the cat out?) | householdInformation | `household_information` | line |
| 38 + 39 | Moving in the next 12 months (+ plans) | householdInformation | `household_information` | line |
| 163 | Plans for your pets when you leave the UAE | householdInformation | `household_information` | line |
| 49, 50 | All occupants and ages; children planned or visiting | householdInformation | `household_information` | lines |
| 51 + 52 | Allergies (+ details) | householdInformation | `household_information` | line |
| 126 | Who has chief legal responsibility | householdInformation | `household_information` | line |
| 91 + 131 | Whole family in agreement (+ explanation) | householdInformation | `household_information` | line |
| 100 + 156 | Where the cat will spend its time (+ supervised outdoors?) | householdInformation | `household_information` | line |
| 138, 139 | Where the cat will eat / sleep | householdInformation | `household_information` | lines |
| 94 | Allow home visits? | householdInformation | `household_information` | line |
| 58 | How current pets react to new cats | existingPets | `existing_pets` | line |
| 59 + 60 | Present pets vaccinated (+ why not) | existingPets | `existing_pets` | line |
| 61 + 62, 63 + 64 | Present / previous pets spayed or neutered (+ why not) | existingPets | `existing_pets` | lines |
| 148 | Are your current cats declawed? | existingPets | `existing_pets` | line |
| 117 | Hours the pet will be left alone | workSchedule | `work_schedule` | line |
| 146 | Where a kitten would be kept when alone | workSchedule | `work_schedule` | line |
| 66 | Plans for the pet when you're on holiday | workSchedule | `work_schedule` | line |
| 107 + 140 | Reference #1 (+ phone) | referee1 | `referee_1` | `Name, phone` |
| 108 + 141 | Reference #2 (+ phone) | referee2 | `referee_2` | `Name, phone` |
| 178 | Signature of Adopter | signedContractReceived | `signed_contract_received` | "Yes" if signed (D4) |

**No column today:** 109 + 142 Reference #3 (D2), 125 birth date, 28 employer, 123 work phone, 30 latest time to call, 166 / 167 Emirates ID (files), 36 agrees to vet-fee reimbursement, 177 vet costs (AED) (D4), 147 plans to declaw, 95 **ever charged with animal cruelty** (D2), 127 money for medical care, 145 cats interested in (D2), 69 / 159 preferences, 75 flea treatment, 164 relocation budget, 128 vet, 149 + 154 / 150 + 155 behaviour and litter problems, 129 cat food, 93 15-20 year commitment, 143 anything else, 179 / 181-184 names, dates and rescuer signature.

## 5. Adoption Form and References (`211304838746458`): updates the application

Found by email (q124), then by full name (q119). Fills empty fields; adds long-text lines under a `From "Adoption Form and References"` heading (D1).

| QID | Jotform question | App field | DB column | How |
|---|---|---|---|---|
| 122 (else 121) | Mobile (else Home) Phone | phone | `phone` | only if empty |
| 120 | Your Home Address | country, city, address | `country`, `city`, `address` | only if empty |
| 107 + 140 + 171 | Reference #1 (+ phone, email) | referee1 | `referee_1` | `Name, phone, email` |
| 108 + 141 + 172 | Reference #2 (+ phone, email) | referee2 | `referee_2` | `Name, phone, email` |
| 126 | Who will have chief responsibility | householdInformation | `household_information` | added line |
| 100 + 156 | Where the cat will spend its time (+ supervised?) | householdInformation | `household_information` | added line |
| 138, 139 | Where the cat will eat / sleep | householdInformation | `household_information` | added lines |
| 94 | Allow home visits? | householdInformation | `household_information` | added line |
| 59 + 60 | Present pets vaccinated (+ why not) | existingPets | `existing_pets` | added line |
| 148 | Are your current cats declawed? | existingPets | `existing_pets` | added line |
| 97, 133, 134 | Adopted before (+ rescue) | previousCatExperience | `pervious_cat_experience` | added line |
| 66 | Holiday plans for the pet | workSchedule | `work_schedule` | added line |

**No column today:** 166 which cat they are applying for (D3), 109 + 142 + 173 Reference #3 (D2), 169 / 170 ID uploads, 158 two nearest airports (travel; D2), 28 employer, 123 work phone, 30 latest time to call, 36 can afford the fee, 147 plans to declaw, 95 cruelty charge (D2), 127 money for medical care, 75 flea treatment, 128 vet, 149 + 154 / 150 + 155 behaviour and litter problems, 129 cat food, 143 anything else.

## 6. Reference Check - IBKT (`220642582493458`): updates the application

Found by the referee's own email (q16) matching one of the referee emails from "Adoption Form and References" (exact, reliable), otherwise by candidate name (q4, typed by the referee, so this can miss or be wrong: shown as a suggestion, not applied, if it's not an exact single match).

| QID | Jotform question | App field | DB column | How |
|---|---|---|---|---|
| - | - | referencesSubmitted | `references_submitted` | "Yes" when the first reference arrives (D5) |
| 5 + 6 + 16 | Referee's name, phone, email | referee1 / referee2 | `referee_1` / `referee_2` | only if that referee isn't listed yet and a slot is free |
| 5, 7, 9, 20-27, 31, 10, 11 | Name; how long known; responsible?; finances; interaction with animals; pets now and before; how pets are treated; health; travels often?; home and routine; opinion; reason not to adopt now; criminal history; anything else | referenceNotes | `reference_notes` | one added section per reference: `Reference from <name> (<date>):` then a line per answer |

**Not set:** `reference_outcome` (a person's judgement). **No column:** 14 signature, 13 date, 29 consent.

## 7. Pet Adoption Contract, England & Wales (`203072984903054`) and Scotland (`220265883187362`)

Same fields on both forms. Found by adopter email (q4), then adopter name (q3). A contract is **one submission that changes twice** (see the research, section 2): the volunteer submits it, then the adopter signs it by editing it.

| When | QID | Jotform field | App field | DB column | How |
|---|---|---|---|---|---|
| Volunteer submits | - | - | finalContractSent | `final_contract_sent` | "Yes" |
| Volunteer submits | - | - | paymentRequired | `payment_required` | "GBP" (D6) |
| Volunteer submits | - | - | paymentStatus | `payment_status` | "Pending", only if empty (D6) |
| Adopter signs | 76 (1 pet) or 23 (2 pets) | Adopter's Signature | signedContractReceived | `signed_contract_received` | "Yes" once the signature is there |
| Either | 9, 64 | Microchip Number (Pet 1 / Pet 2) | linkedCatIds | `linked_cat` | link the cat(s) with that microchip, only if Linked Cat is empty (D3) |

**No column today:** 21 / 78 adoption fee amount (D6), the pet details (species, name, breed, date of birth, sex, description, medical tests matrix, other conditions: the cat's own record already holds these), attachments, the IBKT signatures and dates, "Adoption Agency Details" (IBKT's own details).

The signed contract PDF stays in Jotform (not copied to the Contract File column).

## 8. Forms kept in `jotform_submissions` only (for now)

Possible destinations later, for when you decide:

| Form | Could later update | Match by |
|---|---|---|
| Cat Passport | `cats`: microchip_number, date_of_birth, breed, gender, neutered, vaccinated, felv_fiv_status, medical_summary, passport_complete | Microchip number (exact) |
| Kitty Profile For Rehoming | `cats`: personality_summary, lap_cat, cat_friendly, dog_friendly, child_friendly, indoor_only, medical_summary, special_notes | Cat name (needs confirming) |
| Foster Agreement, Foster Compliance | No table yet (fosters are part of the open roles question) | - |
| Pet Surrender Form | No table yet | - |

## 9. Changes the handlers need in the app

- **New write support** in the database store for `email`, `phone` and `country` (with their companion columns), and a country name to 2-letter code list.
- **Make writable** (server side only, not from the browser): name on create, email, phone, country, city, address, `application_date` (column exists but isn't in the app's field list yet), the six summary columns, referee 1/2, references submitted, reference notes, payment required.
- Creating an application: 1 Monday call each (the item is created at once, as for every new record), about 50 a month at today's volume.

## 10. Decisions needed

- **D1 Later forms and existing values:** fill empty fields and *add* long-text sections (proposed), or overwrite?
- **D2 Important answers with no column:** add columns (for example "Cats Interested In", "Referee 3", "How Heard", a "Screening Flags" text for the cruelty and declawing answers), or leave them in the saved submission (visible under "Form answers", and read by the AI review)?
- **D3 Linking the cat:** link automatically by microchip from contracts (proposed), and for "Which cat are you applying for?" (typed text) only *suggest* a cat for a volunteer to confirm, or never link automatically?
- **D4 UAE all-in-one:** set Signed Contract Received = "Yes" when it arrives signed, although the application isn't approved yet? The vet-cost amount is in AED, and Payment Required has no AED option: add "AED", or use "Other"?
- **D5 References Submitted:** "Yes" at the first reference (proposed), or only once 2 (or 3) have arrived?
- **D6 Contracts and payment:** set Payment Required = GBP and Payment Status = Pending when the contract is sent? Is the fee amount needed (there's no amount column today)?
- **D7 Same person on both creating forms:** a UAE applicant who fills in the Pre-Adoption Form and then the UAE form would create two applications. Should the UAE form update an existing open application with the same email instead (proposed)?
- **D8 A form type arriving twice for one application** (for example a corrected second contract): keep the first submission's IDs in the columns (proposed), or replace them with the latest?
