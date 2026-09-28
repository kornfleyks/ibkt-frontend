# Jotform research: Itty Bitty Kitty Tails

Researched 2026-09-26 against the Jotform REST API using read-only calls (`JOTFORM_API_KEY` in `server/.env`). Nothing in Jotform was created or changed. For submissions, only the *structure* of 1-2 samples per form was inspected: no submission values, account billing details or email addresses appear in this document.

## 1. Summary

- **Account:** `ibktails`, **Silver** plan, **US region** (API host `https://api.jotform.com`), account timezone Asia/Dubai.
- **31 forms:** 18 enabled, 13 disabled. Only **11** of the enabled forms received submissions in 2026; the other 7 enabled forms are dormant or never used (see section 4).
- **4,427 submissions stored** in total across all forms. **93 submissions so far this month** (Sept 1-26), roughly 3-4 per day.
- **Plan limits:** 2,500 submissions/month, 50,000 API calls/day, 50 forms, 10 GB upload storage.
- **Current submission flow:** email only. Enabled forms have 45 notification/autoresponder emails configured. **No form has a webhook**, and the only API-style integration is **Google Sheets on "Cat Passport"**. The only account-level webhook is Jotform's own mobile push (FCM).
- **All forms are the "Legacy" (classic) form type**, which matters for the webhook payload format.
- Nothing in the IBKT codebase references Jotform yet.

## 2. The client's workflow in plain English

This section is pieced together from the forms' fields, their email templates and when each email fires. Parts marked *(assumed)* are a best guess and worth confirming with the client.

### The big picture

- **Jotform only collects answers and sends emails.** It does not approve anyone or move people from one form to the next.
- **The forms are not linked to each other.** No form or email contains a link to another form. Between steps, **a volunteer reads the email, decides, and sends the next form link by hand** (email, WhatsApp, etc.).
- **The one automatic hand-off is the adoption contract.** A volunteer starts it, and Jotform emails the adopter a private link to finish and sign it.
- **There is no shared ID between forms.** Volunteers connect one person's submissions across forms by their name and email. The reference form only asks for the candidate's name, typed as free text.

Who fills in each form: **Applicant** (member of the public), **Referee** (someone vouching for an applicant), **Volunteer** (IBKT team).

### 1. Adopting a cat (UK and US)

```
 Applicant                 Volunteer               Referees (up to 3)         Volunteer + Adopter
 ---------                 ---------               ------------------         -------------------
 1. Pre-Adoption Form ---> reviews, sends link
                           to step 2
 2. Adoption Form and ---> sends Reference Check -> 3. Reference Check - IBKT
    References                link to each referee      (one per referee)
                                                                         ---> final decision
                                                                         4. Pet Adoption Contract
                                                                            (region version)
```

| Step | Form | Who fills it | What they give | Emails sent automatically |
|---|---|---|---|---|
| 1 | **Pre-Adoption Form** | Applicant | Which cat(s) they are interested in, home, household, pet experience, lifestyle | Team: "New Adoption Application - *name*". Applicant: "We've received your adoption application", review within 48 hours. Applicants with a UAE address get a different copy (see UAE below). |
| - | *(no form)* | Volunteer | Reviews the application. If it looks good, sends the applicant the step 2 link. | - |
| 2 | **Adoption Form and References** | Applicant | The specific cat, ID upload, employer, vet, care plans, and **3 personal references** (contact details) | Team is notified. Applicant: "Thank you for completing this final stage... not formally confirmed yet". |
| 3 | **Reference Check - IBKT** | Each referee | Candidate's name, how they know them, opinion on them as a pet owner, signature | Team: "Re: Reference Check - *candidate*". Referee: thank-you plus an invite to "The IBKT Collective". Afterwards the page redirects to IBKT's Instagram. |
| - | *(no form)* | Volunteer | Final decision based on steps 1-3. | - |
| 4a | **Pet Adoption Contract** (England & Wales / Scotland / USA versions) | **Volunteer** | Adopter's name and email, 1 or 2 cats (microchip, medical tests, vaccinations, attachments), adoption fee | Adopter: "Adoption Agreement Issued" with a **private link to the agreement** and bank-transfer payment instructions. Team: a copy with the PDF. |
| 4b | Same contract, opened from the link | **Adopter** | Checks their details, reads the terms, signs | Adopter: "Your signed Adoption Agreement" with the PDF attached. Team: notified again with the PDF. |
| - | *(no form)* | Volunteer | Checks that the adoption fee arrived by bank transfer. Then the adoption is complete. | - |

How step 4 works: the volunteer submits the contract, and Jotform emails the adopter an "edit link" to that same submission. When the adopter signs and saves, it counts as an **edit**, which triggers the "signed" emails. So one contract is **one Jotform submission that changes twice**. This matters for the integration: the app has to pick up edits to see that a contract was signed (see "Edits" in section 5).

The contract comes in two sizes. "Add another pet?" switches the form and its emails between the 1-cat and 2-cat versions.

### 2. Adopting a cat in the UAE

1. **Pre-Adoption Form** (Applicant): same form as above. A UAE address triggers the "Petooti Autoresponder" (a copy of their answers) instead of the standard email.
2. **UAE Adoption Form & Agreement** (Applicant): one large all-in-one form (86 fields). It covers the full application, Emirates ID front and back, and the signed agreement, so there are no separate reference and contract steps.

*(Assumed)* **Petooti** is a partner rescue in the UAE. Several forms offer "Itty Bitty Kitty Tails / Petooti" as the rescuer, and the older contracts have a "Petooti's Rescuer Signature".

### 3. Fostering a cat

| Step | Form | Who | What happens |
|---|---|---|---|
| 1 | **Foster Agreement** (despite the name, this is the **foster application**) | Applicant | Contact details, home, availability, how long they can foster. Team: "New Foster Application - *name*". Applicant: "received, we'll review within 48 hours". |
| - | *(no form)* | Volunteer | Reviews and approves the foster. |
| 2 | **IBKT Foster Compliance & Safeguarding Form** (new, March 2026) | Approved foster | Agrees to every foster rule one by one (indoors only, weekly updates, reply within 24 hours, the cat stays IBKT's property...), plus an emergency contact and 3 references. Signed with Jotform Sign. Team is notified and the foster gets a PDF copy. |
| later | **Welfare Check Form** | Volunteer, at a home visit | Checklist of the cat's health and living conditions, signed by the foster and the volunteer. The foster gets a thank-you email. *Only 1 submission (2023), so it seems to be rarely used.* |

**Foster Call Back Request** was a short "please call me" form; nothing since December 2025.

### 4. Cat records (not tied to one applicant)

| Form | Who *(assumed)* | Purpose | What happens |
|---|---|---|---|
| **Kitty Profile For Rehoming** (password-protected) | Rescuer, foster or owner | Describes one cat's personality, health, litter and feeding habits, probably to write its adoption profile | Team is notified. |
| **Cat Passport** | Volunteer or foster | One cat's medical record: microchip, vaccinations, deworming, FIV/FeLV status, passport scan | Team is notified, and a **row is added to a Google Sheet**. The signed-contract email says the cat's "medical record passport" is attached, so *(assumed)* this is where it comes from. |
| **Pet Surrender Form** | Current owner | Hands up to 3 pets over to a named new owner, with Emirates ID for both and a signature (so UAE) | Team is notified. |

### Things outside Jotform (where your app can help)

- Deciding to approve or reject, and sending the next form link.
- Connecting one person's Pre-Adoption, Adoption Form, 3 references and contract. Today this is done by name and email.
- Checking that the adoption fee has been paid.
- Knowing where each applicant is in the process.

For the integration, this means **the app must match submissions to a person by email address** (and by candidate name for references), unless the forms are later changed to carry an applicant ID. Jotform can pre-fill a hidden field from the link the volunteer sends, which would make this matching exact.

### Small issues noticed (worth telling the client)

1. **Scotland 2-cat contract sends the "Agreement Issued" email twice.** On the Scotland form, "Contract Issued (2Pet)" is set to send on edit as well as on submit. So when a 2-cat adopter signs, they get "Agreement Issued... Action Required" again alongside the "signed" email. The England & Wales version is set up correctly.
2. **Foster applicants get an email subject about adoption.** The Foster Agreement's autoresponder subject is "We've received your adoption application", although the body correctly talks about fostering.
3. **Cat Passport's autoresponder** goes to a fixed address and its body is Jotform's "Now create your own Jotform" advert.
4. **England & Wales contract** has an email rule that fires only for one specific email address (redacted here). It looks like a leftover from testing.
5. **Most "we received your application" emails are also set to send on edit**, so an applicant who edits their submission gets the confirmation again.

## 3. Findings that need attention

1. **Security: a Google OAuth token is stored in Jotform.** The disabled form "Mask Covers For A Cause" still has a Google Drive integration whose settings include an OAuth auth code and access token, readable by anyone with an API key. It dates from 2020-2021 and is probably expired, but the client should remove that integration and revoke Jotform's access in their Google account (Google Account > Security > Third-party access). It is not copied into this document.
2. **Upload storage appears to be over the plan limit.** `/user/usage` reports about 14.66 GB of uploads against the Silver limit of 10.74 GB (10 GiB). The client should check Jotform's account usage page: if uploads are being blocked, the 28 signature and 34 file-upload fields on enabled forms are affected. Deleting old disabled forms' files or upgrading would fix it.
3. **Uploaded files need authentication.** The account has "Require log-in to view uploaded files" enabled, so file and signature URLs in submissions cannot be fetched anonymously. The server will have to download them with the API key (to be verified with a test submission).
4. **API key permissions.** Keep a **read-only** key on the server (polling and fetching submissions need nothing more). Creating webhooks needs full access, so either the client adds them in the Jotform UI (Form > Settings > Integrations > WebHooks) or a full-access key is used once and then deleted.
5. **Password-protected form.** "Kitty Profile For Rehoming" is password protected, and the API returns that password in the form properties. Another reason to treat the API key as a secret.

## 4. Form inventory

### Active (submissions in 2026)

| Form | ID | Submissions | Last submission | Input fields | Notable |
|---|---|---|---|---|---|
| Pre-Adoption Form | `203096212272447` | 1,845 | 2026-09-25 | 36 | file uploads; emails routed by country (UAE vs rest) |
| Foster Agreement | `201745315590453` | 941 | 2026-09-26 | 39 | signature |
| Reference Check - IBKT | `220642582493458` | 330 | 2026-09-22 | 20 | signature; redirects to Instagram after submit |
| Kitty Profile For Rehoming | `211112902350337` | 187 | 2026-09-14 | 41 | matrix, uploads; password-protected |
| Pet Adoption Contract - England & Wales only | `203072984903054` | 160 | 2026-09-05 | 39 | matrix, signature, uploads; 14 rules |
| Adoption Form and References | `211304838746458` | 145 | 2026-09-07 | 49 | uploads |
| UAE Adoption Form & Agreement | `202981102716450` | 141 | 2026-08-16 | 86 | uploads, signature; largest form |
| Cat Passport | `221387152092453` | 98 | 2026-09-11 | 18 | uploads; **Google Sheets integration** |
| Pet Adoption Contract - Scotland only | `220265883187362` | 42 | 2026-09-10 | 39 | matrix, signature, uploads; 14 rules |
| Pet Surrender Form | `211382887164462` | 11 | 2026-08-07 | 29 | uploads, signature |
| IBKT Foster Compliance & Safeguarding Form | `260843004451044` | 8 | 2026-09-21 | 50 | **Jotform Sign**; 48 required fields |

### Enabled but dormant or never used

| Form | ID | Submissions | Last submission |
|---|---|---|---|
| Foster Call Back Request | `200744439642456` | 68 | 2025-12-01 |
| Photography Accident Waiver | `203271484202446` | 5 | 2020-12-03 |
| Pet Adoption Contract - USA only | `223027110333438` | 1 | 2022-10-31 |
| Welfare Check Form | `232852081487461` | 1 | 2023-10-13 |
| USA Adoption Form & Agreement | `223021100571435` | 0 | never |
| USA 1 Pet Adoption Contract | `223056984117459` | 0 | never |
| Clone of Adoption Form and References | `240266010417040` | 0 | never |

### Disabled (13)

Mask Covers For A Cause (325), International Rehoming Adoption Form (75), UAE Adoption Form (21), Greens Cat's Deworming Record (10), Event RSVP Form (4), Cat Profile Builder (3), F1 Qualifying RSVP Form (3), ADSI JD FORM (1), FindUrPet (1), Clone of Pre-Adoption Form (1), UAE Foster Form_Do not use (0), References (0), Clone of Adoption Form and References (0). The last submission to any of them was January 2024.

Full field lists for every form are in the [appendix](#appendix-per-form-field-reference).

## 5. Receiving submissions

### Option A: webhooks (push)

Jotform sends an HTTP POST to a registered URL on every new submission.

- **Format:** `multipart/form-data` (not JSON). Fields include `formID`, `submissionID`, `formTitle`, `pretty` (a human-readable summary), `ip`, `type` and `rawRequest`. `rawRequest` is a JSON string whose keys are `q{qid}_{name}`, for example `q119_yourFull: { first, last }`. The server currently only parses JSON (`express.json()`), so this route would use `multer().none()` (multer is already a dependency).
- **Not signed.** Jotform does not sign webhook requests. Use the same pattern as the existing Monday webhook ([server/webhooks.js](../server/webhooks.js)): a secret in the URL path, compared in constant time, answering 404 otherwise.
- **Treat the webhook as a notification, not as the data.** Take only `submissionID` from the payload, then fetch `GET /submission/{id}` with the API key. That gives the authoritative, structured answers keyed by QID, and a forged request with a made-up ID simply fails the lookup.
- **Risk: Render free tier sleeps.** A cold start can take longer than Jotform is willing to wait, and Jotform does not reliably retry failed deliveries. Submissions could be missed if webhooks are the only mechanism.
- Registered per form: one webhook per form to be integrated (via the UI or `POST /form/{id}/webhooks`).

### Option B: polling (pull)

- One call covers **every form**: `GET /user/submissions?filter={"created_at:gt":"<cursor>"}&limit=1000&orderby=created_at`.
- Every 5 minutes is 288 calls/day, under 1% of the 50,000 daily limit. Latency is up to the poll interval.
- Survives downtime: when Render wakes, the first poll catches up on everything missed.
- The cursor should overlap slightly (for example re-read the last 10 minutes) and rely on de-duplication by submission ID. Jotform's `created_at` timezone must be confirmed with a test submission before it is used as a cursor.

### Recommendation: both, idempotent

1. **Webhook** for near-real-time delivery, but only as a trigger that fetches the submission by ID.
2. **Polling** every few minutes (and once at server startup) as a safety net for anything the webhook missed.
3. **De-duplicate on the Jotform submission ID**, stored with the created record, so a submission arriving by both paths is written once.
4. **Map fields by QID** in a small per-form mapping module (QID to destination column). QIDs are stable when the client edits labels; labels are not.
5. Keep Jotform access in its own server module (like `mondayClient.js`): client, poller, webhook route and per-form mappers as separate files, so the app never depends on Jotform shapes outside the mapping layer. That keeps the later move away from Jotform to a swap of the input side only.

**Monday budget:** at about 4 submissions/day, each costing roughly 2-3 Monday calls (dedupe lookup plus create, more for files), this adds on the order of 10-20 calls/day to the shared 1,000/day limit. File uploads to Monday file columns are the main cost driver.

**Edits:** edits change an existing submission instead of creating a new one. They matter most for the **adoption contracts**: the adopter signs by editing the submission the volunteer created (section 2), so without edits the app would never see that a contract was signed. Webhooks only fire for new submissions *(to verify with a test)*, so the poller also needs an `updated_at:gt` filter. 5 other forms also let submitters edit after submitting.

### Answer formats (from `GET /submission/{id}`)

`answers` is keyed by QID; each entry has `name`, `type`, `text` (the label) and `answer`:

| Field type | `answer` shape |
|---|---|
| textbox, textarea, email, number, radio, dropdown, spinner, widget | string |
| checkbox | array of strings (also `prettyFormat`) |
| fullname | `{ first, last }` (plus `middle`, `prefix`, `suffix` if enabled) |
| address | `{ addr_line1, addr_line2, city, state, postal, country }` |
| phone | `{ area, phone }` (or `{ full }` depending on field settings) |
| datetime, birthdate | `{ month, day, year, datetime }` |
| signature | URL to a PNG (requires authentication, see finding 3 in section 3) |
| fileupload | array of file URLs (requires authentication) |
| matrix | object keyed by row label; each value is a JSON string of the column answers |
| payment | object of product entries plus `paymentArray` (only on the disabled Mask Covers form) |

Webhook `rawRequest` uses the same shapes keyed as `q{qid}_{name}`, but a test submission should confirm each type before the parser is written.

## 6. Considerations for moving the forms into the app

- **Scope is smaller than 31.** 11 forms are actively used. Confirm with the client which of the 7 dormant enabled forms (USA forms, Photography Waiver, Welfare Check, clones) can be retired.
- **Many forms are near-duplicates.** The four "Pet Adoption Contract" forms (England & Wales, Scotland, USA, USA 1) each have 39-41 fields and 12-14 rules, and differ mostly in region-specific wording. UAE and USA "Adoption Form & Agreement" (84-86 fields) are also near-identical. In the app, these can be one form definition with per-region configuration.
- **Conditional logic on enabled forms:** 21 show/hide rules, 20 page-skip rules and 36 email-routing rules; no calculations. A form engine in the app needs show/hide and multi-page navigation at minimum.
- **Emails:** 45 notification and autoresponder emails with templates (some routed by country or by answers). The server has no outbound email capability today, so this is new infrastructure (a provider such as SendGrid, Postmark or SES).
- **Signatures:** 28 signature fields on enabled forms, and one form uses Jotform Sign. Replacing these means capturing signatures in-app and deciding with the client what is legally sufficient for adoption and foster contracts in each jurisdiction.
- **File uploads:** 34 upload fields. The app needs a storage destination (Monday file columns or object storage).
- **Public, unauthenticated access:** these forms are filled in by the public. The app currently requires login for all data routes, so in-app forms need public endpoints with spam protection and rate limiting (rate limiting is already a known gap on login/register).
- **Personal data:** applications contain names, addresses, household details and phone numbers, collected in the UK, UAE and USA. Retention and access rules (UK GDPR in particular) should be agreed before this data is copied into new systems.
- **Links in the wild:** form URLs are shared on the website and social media. Plan redirects or replacement links when each form moves.
- **Historical data:** 4,427 stored submissions. Decide whether to backfill them into the app or leave them in Jotform as an archive.

## 7. Decisions needed

1. **Destination:** where should submissions go? Existing Monday boards (for example Active Applications, Cats, Rescuers), new Monday boards per form type, or a separate database?
2. **First forms:** which forms to integrate first? Suggested by volume: Pre-Adoption Form, Foster Agreement, Reference Check - IBKT.
3. **Mechanism:** webhook plus polling (recommended), or polling only (simpler, a few minutes' delay)?
4. **Edits:** needed for the contracts (to see when they are signed). Should edits on the other forms flow into the app too?
5. **Files and signatures:** copy them into Monday/app storage, or store only a reference to the Jotform file?
6. **Backfill:** import historical submissions, and if so for which forms?
7. **Webhook setup:** will the client add webhooks in the Jotform UI, or should a temporary full-access key be used?
8. **Client follow-ups:** the Google token (section 3, finding 1) and storage limit (finding 2).

---

## Appendix: per-form field reference

Generated from `GET /form/{id}/questions` and `/properties`. Layout-only elements (headings, text blocks, page breaks, buttons, dividers, images) are omitted. **Webhook key** is the key used in the webhook `rawRequest` JSON. Forms are ordered enabled first, then by submission count.

### Pre-Adoption Form (enabled)

| | |
|---|---|
| Form ID | `203096212272447` |
| URL | https://form.jotform.com/203096212272447 |
| Submissions | 1845 (last: 2026-09-25 10:17:39) |
| Created / updated | 2020-11-05 / 2026-07-25 |
| Structure | 36 input fields over 5 page(s) |
| Emails | 1 notification, 2 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | file uploads |

<details><summary>Fields (36)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 165 | `q165_howDid` | dropdown | How did you hear about us? | Yes | Options: Website Enquiry / Facebook / Instagram / Google / Friend/Relative |
| 189 | `q189_whatIs` | textbox | What is your friend/relative's name? |  |  |
| 145 | `q145_whichCatsdogs145` | textarea | Which cat(s)/dog(s) are you interested in? | Yes |  |
| 119 | `q119_yourFull` | fullname | Your Full Name | Yes | Parts: first, last |
| 120 | `q120_yourHome` | address | Your Home Address | Yes | Subfields: st1, st2, city, state, zip, country |
| 25 | `q25_howLong25` | textbox | How long have you lived at this address?: | Yes |  |
| 121 | `q121_phoneNumber` | phone | Phone Number |  |  |
| 124 | `q124_email124` | email | E-mail | Yes |  |
| 167 | `q167_selectOne` | dropdown | Select one of the following: | Yes | Options: Rented / Owned / Living with parents / Shared Accommodation (HMO) |
| 180 | `q180_pleaseDescribe` | dropdown | Please describe your accommodation? | Yes | Options: House / Apartment / Studio Apartment |
| 182 | `q182_doesYou` | radio | Does you home have access to a private garden |  | Options: Yes / No |
| 152 | `q152_whatIs152` | checkbox | What is your household activity level? | Yes | Options: Quiet as a library / Grand Central Station / Somewhere in between / Other |
| 171 | `q171_ifOther` | textarea | If other, please explain: |  |  |
| 174 | `q174_listAll174` | textarea | List all people and their age (including yourself) of who will be living with the new pet | Yes |  |
| 91 | `q91_isYour` | radio | Is your entire immediate family in agreement with the decision to bring a new pet into your home? | Yes | Options: Yes / No |
| 131 | `q131_ifAnyone131` | textarea | If anyone is NOT, please explain: |  |  |
| 172 | `q172_whatIs172` | checkbox | What is your experience as a pet owner? | Yes | Options: First-time owner / Have had 1 or 2 / Knowledgeable and experienced / Other |
| 173 | `q173_ifOther173` | textarea | If other, please explain: |  |  |
| 170 | `q170_whatIs170` | checkbox | What is your reason for wanting to adopt a cat/dog? | Yes | Options: Housepet / Mouse Patrol / Companion / Companion for pet / For the Kids / Gift / Other |
| 153 | `q153_ifOther153` | textarea | If other, please explain: |  |  |
| 186 | `q186_pleaseList` | textarea | Please list all the pets currently living with you, their age, breed and how they would react to having anoth... |  |  |
| 187 | `q187_areYour` | dropdown | Are your current pets sterilised? |  | Options: Yes / No / NA |
| 135 | `q135_whyAre` | textarea | Why are you choosing to adopt vs. buying from a pet store or breeder? | Yes |  |
| 168 | `q168_howMany` | number | How many total hours will your new pet be left alone during the day? |  |  |
| 51 | `q51_areAny` | radio | Are any members of your household allergic to animals? | Yes | Options: Yes / No |
| 52 | `q52_ifYes52` | textarea | If yes, please describe: |  |  |
| 175 | `q175_whoWill` | radio | Who will have chief responsibility for the care of your new pet? |  | Options: Myself / My Partner / My Parents / My Family / Other |
| 176 | `q176_ifOther176` | textarea | If other, please explain: |  |  |
| 151 | `q151_hasA` | radio | Has a pet ever gone missing or been killed in a road traffic accident? | Yes | Options: Yes / No / NA |
| 69 | `q69_ageOf` | checkbox | Age of cat /dog you would consider adopting: (check all that apply) | Yes | Options: Kitten/puppy / Young / Adult / Special Needs / Senior / Bonded pair |
| 159 | `q159_pleaseSelect` | checkbox | Please select your preferences (skip this if you are looking to adopt a dog) |  | Options: Short haired breed / Long haired/exotic breed / Male / Female / Any of the above |
| 93 | `q93_areYou93` | radio | Are you prepared to commit to a pet for 15 - 20 years (average life span)? | Yes | Options: Yes / No |
| 178 | `q178_willYour` | radio | Will your pet be allowed outside? | Yes | Options: Indoors only / Indoor-outdoor / Indoors, with some supervised time outside / Indoors, with a catio so the can still experience some outdoors safely |
| 177 | `q177_tellUs` | textarea | Tell us a little bit more about your typical day and others living with you. Additional information about cur... |  |  |
| 200 | `q200_optionalFeel` | fileupload | OPTIONAL: Feel free to upload some pictures here to support you application. |  | Files (multiple), max 10854 KB |
| 192 | `q192_theInformation` | checkbox | The information you have provided on this form will be used by Itty Bitty Tails for the purposes of facilitat... |  | Options: Email / Phone / Text |

</details>

<details><summary>Conditional logic (5)</summary>

- *email*: if "Your Home Address" notEqualCountry "United Arab Emirates" then send autorespond "Autoresponder 1"
- *email*: if "Your Home Address" equalCountry "United Arab Emirates" then send autorespond "Petooti Autoresponder"
- *field*: if "Your Home Address" equalCountry "United Arab Emirates" then hide "The information you have provided on th..."
- *field*: if "How did you hear about us?" notEquals "Friend/Relative" then hide "What is your friend/relative's name?"
- *field*: if "How did you hear about us?" equals "Friend/Relative" then show "What is your friend/relative's name?"

</details>

### Foster Agreement (enabled)

| | |
|---|---|
| Form ID | `201745315590453` |
| URL | https://form.jotform.com/201745315590453 |
| Submissions | 941 (last: 2026-09-26 05:19:30) |
| Created / updated | 2020-06-23 / 2026-07-25 |
| Structure | 39 input fields over 3 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | signatures, widgets |

<details><summary>Fields (39)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 91 | `q91_howDid` | dropdown | How did you hear about us? | Yes | Options: Itty Bitty Kitty Tails / Petooti |
| 20 | `q20_fullName20` | fullname | Full Name | Yes | Parts: first, last |
| 10 | `q10_age` | number | Age |  |  |
| 87 | `q87_phoneNumber87` | phone | Phone Number - Landline | Yes |  |
| 101 | `q101_phoneNumber` | phone | Phone Number - What’s App (If different to Mobile number) |  |  |
| 12 | `q12_phoneNumber12` | phone | Phone Number - Mobile | Yes |  |
| 6 | `q6_email6` | email | E-mail | Yes |  |
| 7 | `q7_address7` | address | Address | Yes | Subfields: st1, st2, city |
| 80 | `q80_howLong` | textbox | How long can you foster for? |  |  |
| 14 | `q14_doYou` | dropdown | Do you live in a: |  | Options: Apartment / House / Maisonette / Shared Accommodation / Other |
| 15 | `q15_doYou15` | radio | Do you: |  | Options: Own / Rent / Live with parents / Other |
| 18 | `q18_describeYour` | radio | Describe your Homes Activity Level |  | Options: Busy/Noisy / Moderate Comings/Goings / Quiet with Occasional Guests |
| 89 | `q89_pleaseSelect` | checkbox | Please select all that apply: |  | Options: Garden / Balcony / Unhinged windows / Other, please explain |
| 90 | `q90_ifYou90` | textbox | If you selected other, please explain |  |  |
| 83 | `q83_willThe83` | radio | Will the balcony/garden be secured and cat proofed? | Yes | Options: Yes / No |
| 82 | `q82_ifNot82` | textbox | If not, do you agree to NOT let the cat(s) out on to the balcony/garden and you agree to take extra care when... |  |  |
| 19 | `q19_pleaseList19` | textarea | Please list all people living in the household (Include Name, Relationship, Gender and Age) | Yes |  |
| 84 | `q84_ifYou` | radio | If you have children do you understand that if you let your children play with the cat, they need to be super... |  | Options: Yes / No |
| 85 | `q85_ifYou85` | radio | If you have children do you understand that the cat will need a space away from the children? |  | Options: Yes / No |
| 21 | `q21_doesAnyone` | radio | Does anyone in your household have allergies to animals? |  | Options: Yes / No |
| 23 | `q23_pleaseList` | textarea | Please list any pets you have living or deceased (Please include type, name, breed, vaccinations, any health ... | Yes |  |
| 22 | `q22_areAll` | radio | Are all members of your Family agreeable to Fostering a Cat? |  | Options: Yes / No |
| 24 | `q24_doYou24` | radio | Do you have a preference of gender to foster? |  | Options: Male / Female / No Preference |
| 25 | `q25_areYou25` | radio | Are you willing to foster a cat of any age? |  | Options: Yes / No |
| 27 | `q27_ifNot27` | textbox | If not, what age would you consider? |  |  |
| 28 | `q28_pleaseDescribe` | textarea | Please describe the type of cat you are willing to foster (please include breed, coat length, personality tra... |  |  |
| 29 | `q29_weWill` | radio | We will manage the medical financial burden of the cat you foster. Are you willing to take your foster cat to... |  | Options: Yes / No |
| 77 | `q77_doYou77` | radio | Do you drive or have access to a vehicle to bring your foster cat to events and appointments? |  | Options: Yes / No |
| 31 | `q31_areYou31` | radio | Are you willing and able to medicate your foster cat, if applicable? |  | Options: Yes / No |
| 32 | `q32_someOf` | radio | Some of our rescues are abused, therefore require some training. Are you experienced to train with love and p... |  | Options: Yes / No |
| 42 | `q42_howMany` | number | How many hours in a day would the foster be left alone? |  |  |
| 78 | `q78_fosterSignature` | signature | Foster Signature |  |  |
| 96 | `q96_name96` | fullname | Name |  | Parts: first, last |
| 73 | `q73_date73` | datetime | Date | Yes | Format mmddyyyy |
| 93 | `q93_rescuerSignature` | signature | Rescuer Signature |  | **hidden** |
| 95 | `q95_name` | fullname | Name |  | Parts: first, last; **hidden** |
| 94 | `q94_date` | datetime | Date |  | Format mmddyyyy; **hidden** |
| 86 | `q86_followUs` | widget | Follow us for the latest updates |  | Widget: Social Follow |
| 97 | `q97_followUs97` | widget | Follow us for the latest updates |  | Widget: Social Follow |

</details>


### Reference Check - IBKT (enabled)

| | |
|---|---|
| Form ID | `220642582493458` |
| URL | https://form.jotform.com/220642582493458 |
| Submissions | 330 (last: 2026-09-22 13:38:11) |
| Created / updated | 2022-03-06 / 2026-07-25 |
| Structure | 20 input fields over 1 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | redirects to www.instagram.com |
| Notable | signatures |

<details><summary>Fields (20)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 4 | `q4_candidatesName4` | fullname | Candidate's Name | Yes | Parts: first, last |
| 5 | `q5_yourName` | fullname | Your Name | Yes | Parts: first, last |
| 6 | `q6_yourPhone` | phone | Your Phone Number | Yes |  |
| 16 | `q16_yourEmail` | email | Your Email Address | Yes |  |
| 7 | `q7_howLong7` | textbox | How long have you known the applicant and in what capacity (personal/professional)? | Yes |  |
| 9 | `q9_wouldYou` | textarea | Would you consider the applicant to be a responsible person? Please give a reason to support your answer | Yes |  |
| 20 | `q20_fromWhat` | textarea | From what you know (not a typical topic of conversation) are they financially equipped to care for a cat? | Yes |  |
| 21 | `q21_haveYou` | textarea | Have you seen the applicant interacting with animals? How would you describe that interaction? | Yes |  |
| 22 | `q22_doThey` | textarea | Do they currently have pets? Have they had pets before? Do you know where those pets are now? |  |  |
| 23 | `q23_ifSo23` | textarea | If so, how are/were the pets treated at home? (e.g. working animals, family members, therapy, etc.) |  |  |
| 24 | `q24_areYou` | textarea | Are you aware of any health issues which could impact their ability to look after a pet? | Yes |  |
| 31 | `q31_doesThe31` | textbox | Does the applicant travel often? |  |  |
| 25 | `q25_fromWhat25` | textarea | From what you know, could you describe the applicants home, routine and how many hours they are likely to be ... | Yes |  |
| 26 | `q26_whatsYour26` | textarea | What's your opinion of the applicant as a pet owner/foster? | Yes |  |
| 27 | `q27_anyReason27` | textarea | Any reason why now wouldn't be the right time for the applicant to adopt/foster a pet? | Yes |  |
| 10 | `q10_name10` | checkbox | Are you aware of any criminal history of the applicant? | Yes | Options: Yes / No |
| 11 | `q11_areThere11` | textarea | Are there any other factors that we should know about in making a decision to approve the application to Adop... |  |  |
| 29 | `q29_theInformation29` | radio | The information you have provided on this form will be used by Itty Bitty Kitty Tails for the purposes of fac... | Yes | Options: Yes / No |
| 14 | `q14_yourSignature` | signature | Your Signature | Yes |  |
| 13 | `q13_todaysDate` | datetime | Today's Date | Yes | Format mmddyyyy (lite) |

</details>


### Kitty Profile For Rehoming (enabled)

| | |
|---|---|
| Form ID | `211112902350337` |
| URL | https://form.jotform.com/211112902350337 |
| Submissions | 187 (last: 2026-09-14 13:16:33) |
| Created / updated | 2021-04-22 / 2026-06-15 |
| Structure | 41 input fields over 5 page(s) |
| Emails | 1 notification, 0 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | file uploads, password-protected |

<details><summary>Fields (41)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 74 | `q74_yourName` | fullname | Your Name | Yes | Parts: first, last |
| 79 | `q79_whatsYour` | checkbox | What's your relationship to the animal you are filling out this form for? (tick all that apply) | Yes | Options: Rescuer / Foster / Neither, I am filling out the form to help rehoming efforts |
| 52 | `q52_catName` | textbox | Cat Name | Yes |  |
| 68 | `q68_whatGender` | matrix | What gender and age is your cat? |  | Matrix (Dynamic) rows: Cat 1 / Cat 2 / Cat 3; cols: Female / Male / Age |
| 6 | `q6_howLong6` | textbox | How long have you had your cat or how long has it been in a foster home? |  |  |
| 10 | `q10_describeThe` | dropdown | Describe the current household the cat is in |  | Options: Quiet / Active / Noisy |
| 12 | `q12_areThere` | radio | Are there other animals in the home? | Yes | Options: Yes / No |
| 13 | `q13_name13` | checkbox | What types of animals has your cat been around? |  | Options: Cats / Dogs; allows "Other" |
| 50 | `q50_howMany50` | spinner | How many other cats has your cat been around? |  |  |
| 51 | `q51_howMany51` | spinner | How many dogs has your cat been around? |  |  |
| 11 | `q11_howDoes11` | matrix | How does your cat act or behave around the following. Check all that apply. |  | Matrix (Check Box) rows: Children / Strangers / Other Cats / Dogs / Indoors / Outdoors / Loud Noises; cols: Friendly / Cautious / Fearful / Submissive / Tolerates / Aggressive / Essential / Absolutely No / I don't know |
| 67 | `q67_tickAll` | matrix | Tick all that apply (if you don't know, leave blank) |  | Matrix (Check Box) rows: Cat 1 / Cat 2 / Cat 3; cols: FIV+ / FIV Negative / FeLV+ / FELV Negative / Rabies Vaccinated / PCH Booster / Dewormed / Microchipped |
| 20 | `q20_whatMedical20` | textarea | What medical conditions does your cat have if applicable? |  |  |
| 21 | `q21_isYour` | radio | Is your cat currently on any medications or special diets? |  | Options: Yes / No |
| 22 | `q22_pleaseList` | textarea | Please list medications or special diet. |  |  |
| 24 | `q24_isYour24` | radio | Is your cat spayed or neutered? (Did your cat have an operation so it can't have babies?) |  | Options: Yes / No / I don't know |
| 26 | `q26_name26` | checkbox | What type of food does your cat eat? (Check all that apply) |  | Options: Dry / Wet / Both |
| 71 | `q71_pleaseInclude71` | textarea | Please include some detail on feeding routine, food brands, favourite food and treats |  |  |
| 29 | `q29_doesYour29` | radio | Does your cat always use the litterbox? |  | Options: Yes / No; allows "Other" |
| 31 | `q31_whatType` | radio | What type of litter does your cat use? |  | Options: Clay - clumping / Clay - non clumping / Crystal; allows "Other" |
| 32 | `q32_howMany` | radio | How many litterboxes are available? |  | Options: 1 / 2 / 3 / More than 3 |
| 34 | `q34_isThe` | radio | Is the litterbox... |  | Options: Open / Covered / Self-cleaning / Top entry; allows "Other" |
| 35 | `q35_whereIs` | textbox | Where is the litterbox located in your home? |  |  |
| 38 | `q38_name38` | checkbox | Check all that describe your cat's personality: |  | Options: Playful / Couch potato / Talkative / Affectionate / Destructive / Shy / Aggressive / Independent |
| 39 | `q39_hasYour` | radio | Has your cat ever bitten? |  | Options: Yes / No |
| 40 | `q40_pleaseDescribe` | textarea | Please describe the time your cat has bitten in as much detail as possible. |  |  |
| 41 | `q41_didThe` | radio | Did the bite break skin? |  | Options: Yes / No |
| 42 | `q42_whereDoes` | radio | Where does your cat live? |  | Options: Indoor only / Outdoor only / Indoor/Outdoor; allows "Other" |
| 43 | `q43_doesYour43` | radio | Does your cat like to be held? |  | Options: Yes / No |
| 44 | `q44_doesYou` | radio | Does you cat like to be picked up? |  | Options: Yes / No |
| 45 | `q45_isYour45` | radio | Is your cat a lap cat? |  | Options: Yes, often / Yes, sometimes / Rarely / Never |
| 46 | `q46_howDoes` | radio | How does your cat play? |  | Options: Gentle / Somewhat rough / Very rough / Does not play |
| 47 | `q47_whatIs47` | textbox | What is your cat's best quality? |  |  |
| 48 | `q48_whatIs48` | textbox | What is your cat's worst quality? Please be honest and transparent - this will help us ensure the new owner i... |  |  |
| 49 | `q49_pleaseList49` | textarea | Please list any other information it's important for us to know about your cat! |  |  |
| 58 | `q58_pleaseWrite` | textarea | Please write a detailed profile for your cat here including details about your cat's interactions with animal... |  |  |
| 60 | `q60_input60` | fileupload |  |  | Files (multiple), max 10854 KB |
| 72 | `q72_theIdeal` | textarea | The ideal family will.... |  |  |
| 61 | `q61_pleaseUpload61` | fileupload | Please upload pictures (at least 6 clear pictures) and videos (at least 3 which shows how the cat behaves and... | Yes | Files (multiple), max 0 KB |
| 62 | `q62_pleaseUpload` | fileupload | Please upload the pet passport here |  | Files (multiple), max 10854 KB |
| 63 | `q63_pleaseUpload63` | fileupload | Please upload the vets report here. Essential details: General health commentary including mouth, Biochemistr... |  | Files (multiple), max 10854 KB |

</details>

<details><summary>Conditional logic (8)</summary>

- *field*: if "What types of animals has your cat been..." equals "Dogs" then show "How many dogs has your cat been around?"
- *field*: if "What types of animals has your cat been..." equals "Cats" then show "How many other cats has your cat been a..."
- *field*: if "Has your cat ever bitten?" equals "Yes" then showmultiple "Please describe the time your cat has b...", "Did the bite break skin?"
- *field*: if "Does your cat always use the litterbox?" equals "No" then show field 30
- *field*: if "Is your cat currently on any medication..." equals "Yes" then show "Please list medications or special diet."
- *field*: if field 19 equals "Yes" then show "What medical conditions does your cat h..."
- *field*: if field 17 equals "Yes" then show field 18
- *field*: if "Are there other animals in the home?" equals "Yes" then show "What types of animals has your cat been..."

</details>

### Pet Adoption Contract - England & Wales only (enabled)

| | |
|---|---|
| Form ID | `203072984903054` |
| URL | https://form.jotform.com/ibktails/pet-adoption-contract---england--wa |
| Submissions | 160 (last: 2026-09-05 12:14:28) |
| Created / updated | 2020-11-03 / 2026-07-26 |
| Structure | 39 input fields over 7 page(s) |
| Emails | 2 notification, 4 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | signatures, file uploads |

<details><summary>Fields (39)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 3 | `q3_nameOf` | fullname | Name of Adopter |  | Parts: first, last |
| 4 | `q4_emailOf4` | email | Email of Adopter |  |  |
| 5 | `q5_phoneNumber5` | phone | Phone Number of Adopter |  |  |
| 6 | `q6_addressOf6` | address | Address of Adopter |  | Subfields: state, zip, st1, city, st2 |
| 27 | `q27_adoptionAgency` | fullname | Adoption Agency Details |  | Parts: first, last; read-only; **hidden** |
| 28 | `q28_email` | email | Email |  | read-only; **hidden** |
| 29 | `q29_phoneNumber` | phone | Phone Number |  | **hidden** |
| 30 | `q30_address` | address | Address |  | Subfields: state, zip, st1, city, st2; **hidden** |
| 10 | `q10_speciespet` | textbox | Species (Pet 1) |  |  |
| 8 | `q8_petName8` | textbox | Pet Name (Pet 1) |  |  |
| 47 | `q47_breedpet` | textbox | Breed (Pet 1) |  |  |
| 9 | `q9_microchipNumber9` | textbox | Microchip Number (Pet 1) |  |  |
| 13 | `q13_dateOf13` | textbox | Date of Birth (estimated) (Pet 1) |  |  |
| 15 | `q15_sexpet` | dropdown | Sex (Pet 1) |  | Options: Male / Female |
| 14 | `q14_descriptionpet` | textarea | Description (Pet 1) |  |  |
| 17 | `q17_medicalTests17` | matrix | Medical Tests and Vaccination (Pet 1) |  | Matrix (Dynamic) rows: FIV / FELV / Anti-Rabies / PCH/Tricat / Others (please provide details); cols: Date / Result/Details |
| 18 | `q18_otherConditions18` | textarea | Other conditions that the pet has or any other medical information that the adopter should know about (Pet 1) |  |  |
| 49 | `q49_additionalAttachments49` | fileupload | Additional Attachments (Pet 1) |  | Files (multiple), max 10854 KB |
| 55 | `q55_addAnother` | dropdown | Add another pet? | Yes | Options: Yes / No |
| 67 | `q67_speciespet67` | textbox | Species (Pet 2) |  |  |
| 66 | `q66_petName` | textbox | Pet Name (Pet 2) |  |  |
| 65 | `q65_breedpet65` | textbox | Breed (Pet 2) |  |  |
| 64 | `q64_microchipNumber64` | textbox | Microchip Number (Pet 2) |  |  |
| 63 | `q63_dateOf` | textbox | Date of Birth (estimated) (Pet 2) |  |  |
| 62 | `q62_sexpet62` | dropdown | Sex (Pet 2) |  | Options: Male / Female |
| 61 | `q61_descriptionpet61` | textarea | Description (Pet 2) |  |  |
| 59 | `q59_medicalTests` | matrix | Medical Tests and Vaccination (Pet 2) |  | Matrix (Dynamic) rows: FIV / FELV / Anti-Rabies / PCH / Others (please provide details); cols: Date / Result/Details |
| 58 | `q58_otherConditions` | textarea | Other conditions that the pet has or any other medical information that the adopter should know about (Pet 2) |  |  |
| 57 | `q57_additionalAttachments` | fileupload | Additional Attachments (Pet 2) |  | Files (multiple), max 10854 KB |
| 21 | `q21_adoptionFee21` | textbox | Adoption Fee For 1 Pet |  |  |
| 24 | `q24_ittyBitty` | signature | Itty Bitty Kitty Tails Ltd. |  | **hidden** |
| 25 | `q25_date` | datetime | Date |  | Format mmddyyyy (lite) |
| 76 | `q76_adoptersSignature76` | signature | Adopter's Signature |  |  |
| 26 | `q26_date26` | datetime | Date |  | Format mmddyyyy (lite) |
| 78 | `q78_adoptionFee78` | textbox | Adoption Fee For 2 Pets |  |  |
| 74 | `q74_ittyBitty74` | signature | Itty Bitty Kitty Tails Ltd. |  | **hidden** |
| 75 | `q75_date75` | datetime | Date |  | Format mmddyyyy (lite) |
| 23 | `q23_adoptersSignature` | signature | Adopter's Signature |  |  |
| 73 | `q73_date73` | datetime | Date |  | Format mmddyyyy (lite) |

</details>

<details><summary>Conditional logic (14)</summary>

- *page*: if "Add another pet?" equals "No" then hidePage page-4
- *page*: if "Add another pet?" equals "No" then hidePage page-6
- *page*: if "Add another pet?" equals "No" then skipTo page-5
- *page*: if "Add another pet?" equals "Yes" then hidePage page-5
- *page*: if "Add another pet?" equals "Yes" then skipTo page-4
- *email*: if "Add another pet?" equals "Yes" then send autorespond "Contract Issued (2Pet)"
- *email*: if "Add another pet?" equals "Yes" then send notification "Notification 2 Pets"
- *email*: if "Add another pet?" equals "No" then send notification "Notification 1 Pet"
- *email*: if "Add another pet?" equals "No" then send autorespond "Contract Issued (1Pet)"
- *email*: if "Add another pet?" equals "No" then send autorespond "Contract Issued (1Pet)"
- *email*: if "Add another pet?" equals "Yes" then send autorespond "Contract Issued (2Pet)"
- *email*: if "Add another pet?" equals "Yes" AND "Email" is filled then send notification "Notification 2 Pets"
- *email*: if "Email" equals (a specific email address, redacted) then send notification "Notification 2 Pets"
- *field*: if "Date" is filled OR "Adopter's Signature" is filled then show "Adopter's Signature"; show "Date"

</details>

### Adoption Form and References (enabled)

| | |
|---|---|
| Form ID | `211304838746458` |
| URL | https://form.jotform.com/211304838746458 |
| Submissions | 145 (last: 2026-09-07 16:05:42) |
| Created / updated | 2021-05-11 / 2026-07-25 |
| Structure | 49 input fields over 1 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | file uploads, widgets |

<details><summary>Fields (49)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 166 | `q166_whichCat` | textbox | Which cat are your applying for? |  |  |
| 119 | `q119_yourFull` | fullname | Your Full Name | Yes | Parts: first, last |
| 120 | `q120_yourHome` | address | Your Home Address | Yes | Subfields: st1, st2, city, state, zip, country |
| 25 | `q25_howLong25` | textbox | How long have you lived at this address?: | Yes |  |
| 121 | `q121_homePhone121` | phone | Home Phone Number |  |  |
| 122 | `q122_mobileNumber` | phone | Mobile Number |  |  |
| 28 | `q28_nameAnd` | textarea | Name and Address of Employer: |  |  |
| 123 | `q123_workPhone123` | phone | Work Phone Number |  |  |
| 30 | `q30_upUntil` | textbox | Up until what time of night can we contact you via phone? | Yes |  |
| 124 | `q124_email124` | email | E-mail | Yes |  |
| 169 | `q169_pleaseUpload` | fileupload | Please upload ID |  | Files (multiple), max 10854 KB |
| 170 | `q170_pleaseUpload170` | fileupload | Please upload ID |  | Files (multiple), max 10854 KB |
| 158 | `q158_pleaseSelect158` | checkbox | Please select your two nearest airports (only applicable if you are adopting from overseas) |  | Options: London Heathrow / London Gatwick / Manchester / Edinburgh / Glasgow / Paris / Amsterdam / Frankfurt; allows "Other" |
| 36 | `q36_areYou36` | radio | Are you able to afford the advertised adoption fee? | Yes | Options: Yes / No |
| 147 | `q147_areYou` | radio | Are you planning on declawing your new cat or kitten? | Yes | Options: Yes / No / Maybe |
| 148 | `q148_areYour148` | radio | Are your current cats declawed? | Yes | Options: Yes / No / N/A |
| 126 | `q126_whoWill` | textarea | Who will have chief responsibility for the care of your new pet? | Yes |  |
| 59 | `q59_areYour` | radio | Are your present pets up-to-date on their annual vaccines? | Yes | Options: Yes / No / N/A |
| 60 | `q60_ifNo60` | textarea | If no, please explain: |  |  |
| 127 | `q127_howMuch` | textarea | How much are you financially prepared to spend for routine/emergency medical care, licensing, etc? | Yes |  |
| 66 | `q66_whatPlans` | textarea | What plans do you have for your new pet when you are on vacation? | Yes |  |
| 75 | `q75_canwillYou` | radio | Can/Will you provide your cat with monthly flea/tick prevention? | Yes | Options: Yes / No |
| 128 | `q128_whoIs128` | textarea | Who is your current or most recent veterinarian? Please provide their NAME and PHONE NUMBER: PLEASE MAKE SURE... | Yes |  |
| 149 | `q149_ifYour149` | checkbox | If your cat displays behavioral problems (such as poor litter box habits, inappropriate scratching etc.) how ... | Yes | Options: Contact a Professional / Use a book / Personal Knowledge / Other |
| 154 | `q154_ifOther154` | textarea | If other, please explain: |  |  |
| 150 | `q150_whatType` | checkbox | What type of solution would you be willing to try if housebreaking accidents continue after the first week (c... | Yes | Options: Move box to new location / Try a different litter / Clean box more often / Have cat examined by vet / Use a cat door / Return Cat / None / Other |
| 155 | `q155_ifOther155` | textarea | If other, please explain: |  |  |
| 129 | `q129_whatBrand` | textarea | What brand of cat food do you plan on feeding your new cat? | Yes |  |
| 94 | `q94_areYou94` | radio | Are you willing to allow one of our local representatives to make future visits to your home? | Yes | Options: Yes / No |
| 95 | `q95_haveYou95` | radio | Have you or any member of your household ever been charged with cruelty to animals or negligence in animal ca... | Yes | Options: Yes / No |
| 132 | `q132_ifYes132` | textarea | If yes, please describe: |  |  |
| 97 | `q97_haveYou97` | radio | Have you ever adopted or tried to adopt a pet before? If yes, fill out info below. | Yes | Options: Yes / No |
| 133 | `q133_rescueInformation133` | fullname | Rescue Information |  | Parts: first, last |
| 134 | `q134_rescuesPhone` | phone | Rescue's Phone Number |  |  |
| 100 | `q100_whereWill100` | dropdown | Where will your cat spend most of his/her time? | Yes | Options: Indoors Only / Outdoors Only / Indoors and Outdoors / Barn Cat / Basement/Garage / Confined |
| 156 | `q156_ifYou` | radio | If you selected outdoor, would your cat be supervised? |  | Options: Yes / No |
| 138 | `q138_whereWill138` | textarea | Where will your cat eat? |  |  |
| 139 | `q139_whereWill139` | textarea | Where will your cat sleep? | Yes |  |
| 107 | `q107_reference1107` | textbox | Reference #1 |  |  |
| 140 | `q140_reference` | phone | Reference # 1 Phone Number |  |  |
| 171 | `q171_reference1` | email | Reference #1 Email Address | Yes |  |
| 108 | `q108_reference2108` | textbox | Reference #2 |  |  |
| 141 | `q141_reference2` | phone | Reference #2 Phone Number |  |  |
| 172 | `q172_reference2172` | email | Reference #2 Email |  |  |
| 109 | `q109_reference3109` | textbox | Reference #3 |  |  |
| 142 | `q142_reference142` | phone | Reference # 3 Phone Number |  |  |
| 173 | `q173_reference3` | email | Reference #3 Email |  |  |
| 143 | `q143_ifThere` | textarea | If there is anything else you think we should know, please note it here. |  |  |
| 160 | `q160_seeOur` | widget | See our latest updates |  | Widget: Social Follow |

</details>

<details><summary>Conditional logic (2)</summary>

- *email*: if field 165 notEquals "Joy Afif" then send notification "Notification 1"
- *email*: if field 165 equals "Joy Afif" then send notification "Notification 1"; send notification "Notification 1"

</details>

### UAE Adoption Form & Agreement (enabled)

| | |
|---|---|
| Form ID | `202981102716450` |
| URL | https://form.jotform.com/202981102716450 |
| Submissions | 141 (last: 2026-08-16 14:46:39) |
| Created / updated | 2020-10-25 / 2025-04-25 |
| Structure | 86 input fields over 3 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | signatures, file uploads |

<details><summary>Fields (86)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 119 | `q119_yourFull` | fullname | Your Full Name | Yes | Parts: first, last |
| 120 | `q120_yourAddress` | address | Your Address | Yes | Subfields: st1, st2, city, country, state |
| 25 | `q25_howLong25` | textbox | How long have you lived at this address?: | Yes |  |
| 121 | `q121_homePhone121` | phone | Home Phone Number |  |  |
| 122 | `q122_cellPhone122` | phone | Cell Phone Number | Yes |  |
| 28 | `q28_nameAnd` | textarea | Name and Address of Employer: |  |  |
| 123 | `q123_workPhone123` | phone | Work Phone Number |  |  |
| 30 | `q30_upUntil` | textbox | Up until what time of night can we contact you via phone? | Yes |  |
| 124 | `q124_email124` | email | E-mail | Yes |  |
| 169 | `q169_pleaseTell169` | textarea | Please tell us about yourself, your home set-up and experience with pets (past and current) and why you feel ... | Yes |  |
| 166 | `q166_uploadThe` | fileupload | Upload the FRONT of your Emirates ID | Yes | Files (multiple), max 10854 KB |
| 167 | `q167_uploadThe167` | fileupload | Upload the BACK of your Emirates ID | Yes | Files (multiple), max 10854 KB |
| 36 | `q36_doYou36` | radio | Do you agree to pay a reimbursement on vets fees? | Yes | Options: Yes / No |
| 43 | `q43_typeOf` | dropdown | Type of Dwelling: | Yes | Options: House / Apartment / Condo / Mobile Home |
| 160 | `q160_doYou` | radio | Do you own your home? |  | Options: Yes / No |
| 161 | `q161_doYou161` | radio | Do you have a garden/balcony? |  | Options: Garden / Balcony / Both |
| 162 | `q162_ifYes162` | textarea | If yes, do you plan on letting your cat out on to the balcony or outdoors? |  |  |
| 38 | `q38_areYou38` | radio | Are you planning on moving within the next 12 months? | Yes | Options: Yes / No |
| 39 | `q39_ifYes` | textarea | If yes, what are your plans for your pets if you move? |  |  |
| 163 | `q163_uaeIsnt` | textarea | UAE isn’t forever for expats, we all have to leave one day. What are your plans for your pets when you leave? | Yes |  |
| 125 | `q125_birthDate125` | birthdate | Birth Date | Yes |  |
| 49 | `q49_nameAnd49` | textarea | Name and age of ALL occupants in household (including yourself): | Yes |  |
| 50 | `q50_ifNo50` | radio | If no children, do you plan on having children or will children be visiting the household frequently? | Yes | Options: Yes / No |
| 152 | `q152_whatIs` | checkbox | What is your reason for wanting to adopt a cat? | Yes | Options: Housepet / Mouse Patrol / Companion / Companion for pet / Gift / Other |
| 153 | `q153_ifOther153` | textarea | If other, please explain: |  |  |
| 117 | `q117_howMany` | textarea | How many total hours will your new pet be left alone during the day? | Yes |  |
| 146 | `q146_ifAdopting` | textarea | If adopting a kitten, where would the kitten be kept when alone? |  |  |
| 147 | `q147_areYou` | radio | Are you planning on declawing your new cat or kitten? | Yes | Options: Yes / No / Maybe |
| 148 | `q148_areYour148` | radio | Are your current cats declawed? | Yes | Options: Yes / No / N/A |
| 51 | `q51_areAny` | radio | Are any members of your household allergic to animals? | Yes | Options: Yes / No |
| 52 | `q52_ifYes52` | textarea | If yes, please describe: |  |  |
| 126 | `q126_whoWill126` | textarea | Who will have chief legal responsibility for the care of your new pet? | Yes |  |
| 54 | `q54_overThe` | dropdown | Over the past 5 years, how many pets have you owned? (Include current pets) | Yes | Options: 0 / 1 / 2 / 3 / 4 / 5 / 6+ |
| 55 | `q55_listEach` | textarea | List each individually including breed, age, still living with you? (if not, why?) |  |  |
| 56 | `q56_haveYou56` | radio | Have you and your spouse (if applicable) ever owned a cat together? | Yes | Options: Yes / No / N/A |
| 115 | `q115_ifYes115` | textarea | If yes, when? |  |  |
| 151 | `q151_haveYou` | radio | Have you ever lost or given away a pet? | Yes | Options: Yes / No |
| 58 | `q58_ifYou58` | textarea | If you currently own a dog or cat, how does he/she react to new cats? |  |  |
| 59 | `q59_areYour` | radio | Are your present pets up-to-date on their annual vaccines? | Yes | Options: Yes / No / N/A |
| 60 | `q60_ifNo60` | textarea | If no, please explain: |  |  |
| 61 | `q61_areYour61` | radio | Are your present pets spayed or neutered? | Yes | Options: Yes / No / N/A |
| 62 | `q62_ifNo62` | textarea | If no, please explain. |  |  |
| 63 | `q63_wereYour` | radio | Were your previous pets spayed or neutered? | Yes | Options: Yes / No / N/A |
| 64 | `q64_ifNo64` | textarea | If no, please explain. |  |  |
| 127 | `q127_howMuch` | textarea | How much are you financially prepared to spend for routine/emergency medical care, licensing, etc? | Yes |  |
| 66 | `q66_whatPlans` | textarea | What plans do you have for your new pet when you are on vacation? | Yes |  |
| 145 | `q145_whichCats` | textarea | Which cat(s) are you interested in? | Yes |  |
| 69 | `q69_ageOf` | checkbox | Age of cat you would consider adopting: (check all that apply) | Yes | Options: Kitten / Young / Adult / Special Needs / Senior |
| 159 | `q159_pleaseSelect159` | checkbox | Please select your preferences: |  | Options: Short haired breed / Long haired/exotic breed / Male / Female / Any of the above |
| 75 | `q75_canwillYou` | radio | Can/Will you provide your cat with monthly flea/tick prevention? | Yes | Options: Yes / No |
| 164 | `q164_howMuch164` | textbox | How much are you prepared to spend on relocating your cat(s) with you when you leave? |  |  |
| 128 | `q128_whoIs128` | textarea | Who is your current or most recent veterinarian? Please provide their NAME and PHONE NUMBER: PLEASE MAKE SURE... | Yes |  |
| 149 | `q149_ifYour149` | checkbox | If your cat displays behavioral problems (such as poor litter box habits, inappropriate scratching etc.) how ... | Yes | Options: Contact a Professional / Use a book / Personal Knowledge / Other |
| 154 | `q154_ifOther154` | textarea | If other, please explain: |  |  |
| 150 | `q150_whatType` | checkbox | What type of solution would you be willing to try if housebreaking accidents continue after the first week (c... | Yes | Options: Move box to new location / Try a different litter / Clean box more often / Have cat examined by vet / Use a cat door / Return Cat / None / Other |
| 155 | `q155_ifOther155` | textarea | If other, please explain: |  |  |
| 129 | `q129_whatBrand` | textarea | What brand of cat food do you plan on feeding your new cat? | Yes |  |
| 91 | `q91_isYour` | radio | Is your entire immediate family in agreement with the decision to bring a new pet into your home? | Yes | Options: Yes / No |
| 131 | `q131_ifAnyone131` | textarea | If anyone is NOT, please explain: |  |  |
| 93 | `q93_areYou93` | radio | Are you prepared to commit to a pet for 15 - 20 years (average life span)? | Yes | Options: Yes / No |
| 94 | `q94_areYou94` | radio | Are you willing to allow one of our local representatives to make future visits to your home? | Yes | Options: Yes / No |
| 95 | `q95_haveYou95` | radio | Have you or any member of your household ever been charged with cruelty to animals or negligence in animal ca... | Yes | Options: Yes / No |
| 132 | `q132_ifYes132` | textarea | If yes, please describe: |  |  |
| 97 | `q97_haveYou97` | radio | Have you ever adopted or tried to adopt a pet before? If yes, fill out info below. | Yes | Options: Yes / No |
| 133 | `q133_rescueInformation133` | fullname | Rescue Information |  | Parts: first, last |
| 134 | `q134_rescuesPhone` | phone | Rescue's Phone Number |  |  |
| 135 | `q135_whyAre` | textarea | Why are you choosing to adopt vs. buying from a pet store or breeder? | Yes |  |
| 136 | `q136_ifOther` | textarea | If other, please explain: |  |  |
| 100 | `q100_whereWill100` | dropdown | Where will your cat spend most of his/her time? | Yes | Options: Indoors Only / Outdoors Only / Indoors and Outdoors / Barn Cat / Basement/Garage / Confined |
| 156 | `q156_ifYou` | radio | If you selected outdoor, would your cat be supervised? |  | Options: Yes / No |
| 138 | `q138_whereWill138` | textarea | Where will your cat eat? | Yes |  |
| 139 | `q139_whereWill139` | textarea | Where will your cat sleep? | Yes |  |
| 107 | `q107_reference1107` | textbox | Reference #1 | Yes |  |
| 140 | `q140_reference` | phone | Reference # 1 Phone Number | Yes |  |
| 108 | `q108_reference2108` | textbox | Reference #2 | Yes |  |
| 141 | `q141_reference2` | phone | Reference #2 Phone Number | Yes |  |
| 109 | `q109_reference3109` | textbox | Reference #3 | Yes |  |
| 142 | `q142_reference142` | phone | Reference # 3 Phone Number | Yes |  |
| 143 | `q143_ifThere` | textarea | If there is anything else you think we should know, please note it here. |  |  |
| 177 | `q177_vetCosts177` | textbox | Vet Costs Reimbursments (AED) |  |  |
| 178 | `q178_signatureOf` | signature | Signature of Adopter |  |  |
| 179 | `q179_typeName179` | textbox | Type Name of Adopter |  |  |
| 181 | `q181_date` | datetime | Date |  | Format mmddyyyy (lite) |
| 182 | `q182_signatureOf182` | signature | Signature of Rescuer/Owner |  | **hidden** |
| 183 | `q183_typeName` | textbox | Type name of Rescuer/Owner |  | **hidden** |
| 184 | `q184_date184` | datetime | Date |  | Format mmddyyyy (lite); **hidden** |

</details>


### Cat Passport (enabled)

| | |
|---|---|
| Form ID | `221387152092453` |
| URL | https://form.jotform.com/ibktails/cat-passport |
| Submissions | 98 (last: 2026-09-11 04:47:43) |
| Created / updated | 2022-05-19 / 2025-07-31 |
| Structure | 18 input fields over 1 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | google-sheets; webhooks: none |
| After submit | thank-you message |
| Notable | file uploads |

<details><summary>Fields (18)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 20 | `q20_catName` | textbox | Cat Name |  |  |
| 5 | `q5_dateOf` | datetime | Date of Birth |  | Format ddmmyyyy (lite) |
| 4 | `q4_gender` | radio | Gender |  | Options: Male / Female |
| 23 | `q23_sterilised` | radio | Sterilised |  | Options: Spayed / Neutered; allows "Other" |
| 21 | `q21_breed` | radio | Breed |  | Options: Domestic Short Hair / Domestic Medium Hair / Domestic Long Hair; allows "Other" |
| 22 | `q22_colourmarkings` | textbox | Colour/Markings |  |  |
| 24 | `q24_microchipNumber` | number | Microchip Number |  |  |
| 38 | `q38_reenterMicrochip` | number | Reenter Microchip Number |  |  |
| 25 | `q25_microchipImplant` | datetime | Microchip Implant Date |  | Format ddmmyyyy (lite) |
| 26 | `q26_firstTricat` | datetime | First Tricat |  | Format ddmmyyyy (lite) |
| 27 | `q27_boosterTricat` | datetime | Booster Tricat |  | Format ddmmyyyy (lite) |
| 28 | `q28_rabiesVaccination` | datetime | Rabies Vaccination |  | Format ddmmyyyy (lite) |
| 32 | `q32_lastDewormed` | datetime | Last Dewormed |  | Format ddmmyyyy (lite) |
| 30 | `q30_fivfelvStatus` | radio | FIV/FeLV Status |  | Options: Negative for Both / FIV+ / FeLV+ / Positive for Both / Not tested (kitten); allows "Other" |
| 33 | `q33_anyMedical` | textarea | Any Medical Conditions |  |  |
| 34 | `q34_uploadMedical` | fileupload | Upload Medical Report |  | Files (multiple), max 10854 KB |
| 35 | `q35_uploadPassport` | fileupload | Upload Passport - Scanned clear copy as a PDF ONLY |  | Files (multiple), max 10854 KB |
| 12 | `q12_nameOf` | fullname | Name of Parent/Guardian |  | Parts: first, last |

</details>

<details><summary>Conditional logic (3)</summary>

- *field*: if "Microchip Number" equals "{reenterMicrochip}" then hide "MICROCHIP NUMBERS DO NOT MATCH. CHECK A..."
- *field*: if "Microchip Number" is empty AND "Reenter Microchip Number" is empty then hide "MICROCHIP NUMBERS DO NOT MATCH. CHECK A..."
- *field*: if "Microchip Number" notEquals "{reenterMicrochip}" then show "MICROCHIP NUMBERS DO NOT MATCH. CHECK A..."

</details>

### Foster Call Back Request (enabled)

| | |
|---|---|
| Form ID | `200744439642456` |
| URL | https://form.jotform.com/ibktails/call-back |
| Submissions | 68 (last: 2025-12-01 12:47:59) |
| Created / updated | 2020-03-15 / 2022-02-11 |
| Structure | 6 input fields over 2 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | - |

<details><summary>Fields (6)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 20 | `q20_fullName20` | fullname | Full Name | Yes | Parts: first, last |
| 21 | `q21_phoneNumber21` | phone | Phone Number | Yes |  |
| 22 | `q22_email` | email | Email |  |  |
| 25 | `q25_whenCan` | checkbox | When can you start fostering? |  | Options: Immediately / Next week / Next month; allows "Other" |
| 26 | `q26_howLong` | textbox | How long can you foster for? |  |  |
| 19 | `q19_whenCan19` | datetime | When can we call you? | Yes | Format mmddyyyy + time |

</details>


### Pet Adoption Contract - Scotland only (enabled)

| | |
|---|---|
| Form ID | `220265883187362` |
| URL | https://form.jotform.com/220265883187362 |
| Submissions | 42 (last: 2026-09-10 15:45:04) |
| Created / updated | 2022-01-27 / 2026-07-26 |
| Structure | 39 input fields over 7 page(s) |
| Emails | 2 notification, 4 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | signatures, file uploads |

<details><summary>Fields (39)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 3 | `q3_nameOf` | fullname | Name of Adopter |  | Parts: first, last |
| 4 | `q4_emailOf4` | email | Email of Adopter |  |  |
| 5 | `q5_phoneNumber5` | phone | Phone Number of Adopter |  |  |
| 6 | `q6_addressOf6` | address | Address of Adopter |  | Subfields: state, zip, st1, city, st2 |
| 27 | `q27_adoptionAgency` | fullname | Adoption Agency Details |  | Parts: first, last; **hidden** |
| 28 | `q28_email` | email | Email |  | read-only; **hidden** |
| 29 | `q29_phoneNumber` | phone | Phone Number |  | **hidden** |
| 30 | `q30_address` | address | Address |  | Subfields: state, zip, st1, city, st2; **hidden** |
| 10 | `q10_speciespet` | textbox | Species (Pet 1) |  |  |
| 8 | `q8_petName8` | textbox | Pet Name (Pet 1) |  |  |
| 47 | `q47_breedpet` | textbox | Breed (Pet 1) |  |  |
| 9 | `q9_microchipNumber9` | textbox | Microchip Number (Pet 1) |  |  |
| 13 | `q13_dateOf13` | textbox | Date of Birth (estimated) (Pet 1) |  |  |
| 15 | `q15_sexpet` | dropdown | Sex (Pet 1) |  | Options: Male / Female |
| 14 | `q14_descriptionpet` | textarea | Description (Pet 1) |  |  |
| 17 | `q17_medicalTests17` | matrix | Medical Tests and Vaccination (Pet 1) |  | Matrix (Dynamic) rows: FIV / FELV / Anti-Rabies / PCH/Tricat / Others (please provide details); cols: Date / Result/Details |
| 18 | `q18_otherConditions18` | textarea | Other conditions that the pet has or any other medical information that the adopter should know about (Pet 1) |  |  |
| 49 | `q49_additionalAttachments49` | fileupload | Additional Attachments (Pet 1) |  | Files (multiple), max 10854 KB |
| 55 | `q55_addAnother` | dropdown | Add another pet? | Yes | Options: Yes / No |
| 67 | `q67_speciespet67` | textbox | Species (Pet 2) |  |  |
| 66 | `q66_petName` | textbox | Pet Name (Pet 2) |  |  |
| 65 | `q65_breedpet65` | textbox | Breed (Pet 2) |  |  |
| 64 | `q64_microchipNumber64` | textbox | Microchip Number (Pet 2) |  |  |
| 63 | `q63_dateOf` | textbox | Date of Birth (estimated) (Pet 2) |  |  |
| 62 | `q62_sexpet62` | dropdown | Sex (Pet 2) |  | Options: Male / Female |
| 61 | `q61_descriptionpet61` | textarea | Description (Pet 2) |  |  |
| 59 | `q59_medicalTests` | matrix | Medical Tests and Vaccination (Pet 2) |  | Matrix (Dynamic) rows: FIV / FELV / Anti-Rabies / PCH / Others (please provide details); cols: Date / Result/Details |
| 58 | `q58_otherConditions` | textarea | Other conditions that the pet has or any other medical information that the adopter should know about (Pet 2) |  |  |
| 57 | `q57_additionalAttachments` | fileupload | Additional Attachments (Pet 2) |  | Files (multiple), max 10854 KB |
| 21 | `q21_adoptionFee21` | textbox | Adoption Fee For 1 Pet |  |  |
| 76 | `q76_adoptersSignature76` | signature | Adopter's Signature |  |  |
| 25 | `q25_date` | datetime | Date |  | Format mmddyyyy (lite) |
| 24 | `q24_ittyBitty` | signature | Itty Bitty Kitty Tails Ltd. |  | **hidden** |
| 26 | `q26_date26` | datetime | Date |  | Format mmddyyyy (lite) |
| 78 | `q78_adoptionFee78` | textbox | Adoption Fee For 2 Pets |  |  |
| 23 | `q23_adoptersSignature` | signature | Adopter's Signature |  |  |
| 75 | `q75_date75` | datetime | Date |  | Format mmddyyyy (lite) |
| 73 | `q73_date73` | datetime | Date |  | Format mmddyyyy (lite) |
| 74 | `q74_ittyBitty74` | signature | Itty Bitty Kitty Tails Ltd. |  | **hidden** |

</details>

<details><summary>Conditional logic (14)</summary>

- *page*: if "Add another pet?" equals "No" then hidePage page-4
- *page*: if "Add another pet?" equals "No" then hidePage page-6
- *page*: if "Add another pet?" equals "No" then skipTo page-5
- *page*: if "Add another pet?" equals "Yes" then hidePage page-5
- *page*: if "Add another pet?" equals "Yes" then skipTo page-4
- *email*: if "Add another pet?" notEquals "No" OR "Add another pet?" equals "Yes" then send autorespond "Signed Agreement Received (2Pet)"; send autorespond "Contract Issued (2Pet)"
- *email*: if "Add another pet?" notEquals "No" OR "Add another pet?" equals "Yes" then send autorespond "Signed Agreement Received (2Pet)"; send autorespond "Contract Issued (2Pet)"
- *email*: if "Add another pet?" notEquals "Yes" AND "Add another pet?" equals "No" then send notification "Notification 1 Pet"
- *email*: if "Add another pet?" notEquals "Yes" AND "Add another pet?" equals "No" then send autorespond "Signed Agreement Received (1 Pet)"; send autorespond "Contract Issued (1Pet)"
- *email*: if "Add another pet?" equals "No" then send autorespond "Contract Issued (1Pet)"
- *email*: if "Add another pet?" equals "Yes" then send autorespond "Contract Issued (2Pet)"
- *email*: if "Add another pet?" equals "Yes" AND "Email" is filled then send notification "Notification 2 Pets"
- *email*: if "Email" equals (a specific email address, redacted) then send notification "Notification 2 Pets"
- *field*: if "Date" is filled OR "Adopter's Signature" is filled then show "Adopter's Signature"; show "Date"

</details>

### Pet Surrender Form (enabled)

| | |
|---|---|
| Form ID | `211382887164462` |
| URL | https://form.jotform.com/211382887164462 |
| Submissions | 11 (last: 2026-08-07 12:35:38) |
| Created / updated | 2021-05-19 / 2021-06-21 |
| Structure | 29 input fields over 3 page(s) |
| Emails | 1 notification, 0 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | signatures, file uploads |

<details><summary>Fields (29)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 104 | `q104_date104` | datetime | Date |  | Format mmddyyyy (lite) |
| 52 | `q52_yourFull` | textbox | Your full name: |  |  |
| 54 | `q54_yourEmail` | textbox | Your email address: |  |  |
| 60 | `q60_yourEid60` | fileupload | Your EID Front and Back |  | Files (multiple), max 10854 KB |
| 82 | `q82_pet1` | dropdown | Pet 1 Species | Yes | Options: Cat / Dog |
| 4 | `q4_petName` | textbox | Pet name 1: | Yes |  |
| 77 | `q77_microchipNumber` | textbox | Microchip Number Cat 1 |  | Validation: Numeric |
| 88 | `q88_breed` | textbox | Breed: |  |  |
| 110 | `q110_sex` | textbox | Sex: |  |  |
| 111 | `q111_description` | textbox | Description: |  |  |
| 89 | `q89_attachPet` | fileupload | Attach pet 1 passport/vaccination record here |  | Files (multiple), max 10854 KB |
| 83 | `q83_pet2` | dropdown | Pet 2 Species |  | Options: Cat / Dog |
| 74 | `q74_petName74` | textbox | Pet name 2: |  |  |
| 78 | `q78_microchipNumber78` | textbox | Microchip Number Cat 2 |  | Validation: Numeric |
| 92 | `q92_breed92` | textbox | Breed: |  |  |
| 112 | `q112_sex112` | textbox | Sex: |  |  |
| 113 | `q113_description113` | textbox | Description: |  |  |
| 90 | `q90_attachPet90` | fileupload | Attach pet 2 passport/vaccination record here |  | Files (multiple), max 10854 KB |
| 84 | `q84_pet3` | dropdown | Pet 3 Species |  | Options: Cat / Dog |
| 75 | `q75_petName75` | textbox | Pet name 3: |  |  |
| 79 | `q79_microchipNumber79` | textbox | Microchip Number Cat 3 |  | Validation: Numeric |
| 91 | `q91_breed91` | textbox | Breed: |  |  |
| 114 | `q114_sex114` | textbox | Sex: |  |  |
| 115 | `q115_description115` | textbox | Description: |  |  |
| 93 | `q93_attachPet93` | fileupload | Attach pet 3 passport/vaccination record here |  | Files (multiple), max 10854 KB |
| 80 | `q80_newOwner80` | textbox | New Owner Full Name: |  |  |
| 81 | `q81_newOwner81` | textbox | New Owner email address: |  |  |
| 61 | `q61_newOwner61` | fileupload | New Owner EID front and back |  | Files (multiple), max 0 KB |
| 99 | `q99_signaturerequired` | signature | Signature (Required) |  |  |

</details>


### IBKT Foster Compliance & Safeguarding Form (enabled)

| | |
|---|---|
| Form ID | `260843004451044` |
| URL | https://form.jotform.com/260843004451044 |
| Submissions | 8 (last: 2026-09-21 15:46:38) |
| Created / updated | 2026-03-26 / 2026-03-26 |
| Structure | 50 input fields over 1 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | signatures, Jotform Sign |

<details><summary>Fields (50)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 56 | `q56_fullName` | fullname | Full Name | Yes | Parts: first, last |
| 57 | `q57_phoneNumber` | phone | Phone Number | Yes |  |
| 58 | `q58_emailAddress` | email | Email Address | Yes |  |
| 59 | `q59_residentialAddress` | address | Residential Address | Yes | Subfields: state, zip, st1, city, st2 |
| 3 | `q3_q3_radio1` | radio | Do you agree to provide adequate food, fresh water, and a clean environment at all times? | Yes | Options: Yes / No |
| 4 | `q4_q4_radio2` | radio | Do you agree to treat the foster cat with patience, care, and positive reinforcement? | Yes | Options: Yes / No |
| 5 | `q5_q5_radio3` | radio | Do you agree to administer routine flea and worming treatment as directed by IBKT? | Yes | Options: Yes / No |
| 6 | `q6_q6_radio4` | radio | Do you agree to notify IBKT immediately if the cat becomes unwell, injured, or shows concerning behaviour? | Yes | Options: Yes / No |
| 7 | `q7_q7_radio5` | radio | Do you agree to keep the cat strictly indoors at all times unless otherwise authorised by IBKT? | Yes | Options: Yes / No |
| 8 | `q8_q8_radio6` | radio | Do you agree the cat will never be allowed to roam freely outside? | Yes | Options: Yes / No |
| 9 | `q9_q9_radio7` | radio | Do you agree to ensure all windows, balconies, and access points are secured and cat-proofed? | Yes | Options: Yes / No |
| 10 | `q10_q10_radio8` | radio | Do you understand the cat remains the property of IBKT at all times? | Yes | Options: Yes / No |
| 11 | `q11_q11_radio9` | radio | Do you agree not to transfer, rehome, or allow anyone else to care for the cat without written approval from ... | Yes | Options: Yes / No |
| 12 | `q12_q12_radio10` | radio | Do you agree that all adoption enquiries must be directed to IBKT and not handled independently? | Yes | Options: Yes / No |
| 13 | `q13_q13_radio11` | radio | Do you agree to provide weekly updates (including photos/videos) on the cat in your care? | Yes | Options: Yes / No |
| 14 | `q14_q14_radio12` | radio | Do you agree to respond to IBKT communications within 24 hours? | Yes | Options: Yes / No |
| 15 | `q15_q15_radio13` | radio | Do you agree to facilitate meet and greets with potential adopters when required? | Yes | Options: Yes / No |
| 16 | `q16_q16_radio14` | radio | Do you understand and agree that: - No response within 24 hours will be flagged as a concern - No response wi... | Yes | Options: Yes / No |
| 17 | `q17_q17_radio15` | radio | Do you agree not to take the cat to a vet without IBKT approval unless it is an emergency? | Yes | Options: Yes / No |
| 18 | `q18_q18_radio16` | radio | In the case of an emergency, do you agree to seek immediate care and inform IBKT as soon as possible? | Yes | Options: Yes / No |
| 19 | `q19_q19_radio17` | radio | Do you confirm that any resident pets are vaccinated and neutered/spayed? | Yes | Options: Yes / No |
| 20 | `q20_q20_radio18` | radio | Do you agree to follow IBKT guidance on introductions and isolation periods? | Yes | Options: Yes / No |
| 22 | `q22_q22_radio20` | radio | Do you understand IBKT reserves the right to remove the cat at any time if concerns arise? | Yes | Options: Yes / No |
| 23 | `q23_q23_radio21` | radio | Do you accept responsibility for any damage or incidents caused while the cat is in your care? | Yes | Options: Yes / No |
| 24 | `q24_q24_radio22` | radio | Do you agree to return the cat to IBKT if you are no longer able to foster, providing as much notice as possi... | Yes | Options: Yes / No |
| 26 | `q26_q26_fullname24` | fullname | Full Name (Emergency Contact) | Yes | Parts: first, last |
| 27 | `q27_q27_textbox25` | textbox | Relationship to you (Emergency Contact) | Yes |  |
| 28 | `q28_q28_phone26` | phone | Phone Number (Emergency Contact) | Yes |  |
| 29 | `q29_q29_email27` | email | Email Address (Emergency Contact) | Yes |  |
| 30 | `q30_q30_address28` | address | Address (Emergency Contact) | Yes | Subfields: state, zip, st1, city, st2 |
| 32 | `q32_q32_textbox30` | textbox | Reference 1 Name | Yes |  |
| 33 | `q33_q33_textbox31` | textbox | Reference 1 Relationship | Yes |  |
| 34 | `q34_q34_phone32` | phone | Reference 1 Phone | Yes |  |
| 35 | `q35_q35_email33` | email | Reference 1 Email | Yes |  |
| 36 | `q36_q36_textbox34` | textbox | Reference 2 Name | Yes |  |
| 37 | `q37_q37_textbox35` | textbox | Reference 2 Relationship | Yes |  |
| 38 | `q38_q38_phone36` | phone | Reference 2 Phone | Yes |  |
| 39 | `q39_q39_email37` | email | Reference 2 Email | Yes |  |
| 40 | `q40_q40_textbox38` | textbox | Reference 3 Name | Yes |  |
| 41 | `q41_q41_textbox39` | textbox | Reference 3 Relationship | Yes |  |
| 42 | `q42_q42_phone40` | phone | Reference 3 Phone | Yes |  |
| 43 | `q43_q43_email41` | email | Reference 3 Email | Yes |  |
| 45 | `q45_q45_radio43` | radio | Have you ever had a disagreement or issue with a rescue organisation or rehomed an animal independently? | Yes | Options: Yes / No |
| 46 | `q46_q46_textarea44` | textarea | If yes, please provide details |  |  |
| 48 | `q48_q48_radio46` | radio | I confirm that all information provided is accurate and truthful. | Yes | Options: Yes / No |
| 49 | `q49_q49_radio47` | radio | I understand that failure to comply with IBKT policies may result in immediate removal of the cat. | Yes | Options: Yes / No |
| 50 | `q50_q50_radio48` | radio | I agree to abide by all IBKT fostering policies and instructions. | Yes | Options: Yes / No |
| 51 | `q51_q51_fullname49` | fullname | Full Name (Declaration) | Yes | Parts: first, last |
| 52 | `q52_q52_datetime50` | datetime | Date | Yes | Format mmddyyyy (lite) |
| 61 | `q61_signature` | signature | Signature |  |  |

</details>

<details><summary>Conditional logic (1)</summary>

- *field*: if "Have you ever had a disagreement or iss..." equals "Yes" then show "If yes, please provide details"

</details>

### Photography Accident Waiver (enabled)

| | |
|---|---|
| Form ID | `203271484202446` |
| URL | https://form.jotform.com/203271484202446 |
| Submissions | 5 (last: 2020-12-03 04:43:49) |
| Created / updated | 2020-11-23 / 2023-12-07 |
| Structure | 14 input fields over 1 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | signatures |

<details><summary>Fields (14)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 35 | `q35_date` | datetime | Date | Yes | Format mmddyyyy (lite) |
| 31 | `q31_fullName31` | fullname | Full Name | Yes | Parts: first, last |
| 30 | `q30_clientPhone30` | phone | Client Phone Number | Yes |  |
| 33 | `q33_email33` | email | E-mail | Yes |  |
| 29 | `q29_address` | address | Address | Yes | Subfields: st1, st2, city, state |
| 53 | `q53_acknowledgment53` | checkbox | Acknowledgment | Yes | Options: I have read the “Model Release” above and agree to the described terms. |
| 54 | `q54_acknowledgment54` | checkbox | Acknowledgment | Yes | Options: I have read the “Accident Waiver and Release of Liability” document above and agree to the described terms. |
| 38 | `q38_ageVerification` | radio | Age Verification | Yes | Options: I am over the age of 18. / I am over the age of 18 and have a child / children under the age of 18 participating in this photoshoot. (children names listed below) / I am under the age of 18. |
| 37 | `q37_input37` | inline |  |  |  |
| 36 | `q36_socialMedia` | radio | Social Media | Yes | Options: I want to be "tagged" on social media posts. / I do not want to be "tagged" on social media posts. |
| 61 | `q61_pleaseSelect` | checkbox | Please select platforms in which you would like to be "tagged". |  | Options: Facebook / Instagram / Twitter |
| 73 | `q73_ifYou` | textarea | If you have selected that you want to be tagged, please mention you social media handles below: |  |  |
| 12 | `q12_acknowledgment` | checkbox | Acknowledgment | Yes | Options: I have read and understand the terms of this accident waiver, release of liability form, and model release with Petooti Fabric and Masks . |
| 8 | `q8_signature8` | signature | Signature | Yes |  |

</details>

<details><summary>Conditional logic (2)</summary>

- *field*: if "Social Media" equals "I want to be "tagged" on soci..." then show "Please select platforms in which you wo..."
- *field*: if "Age Verification" equals "I am over the age of 18 and h..." then show ""

</details>

### Pet Adoption Contract - USA only (enabled)

| | |
|---|---|
| Form ID | `223027110333438` |
| URL | https://form.jotform.com/223027110333438 |
| Submissions | 1 (last: 2022-10-31 10:01:11) |
| Created / updated | 2022-10-30 / 2022-11-02 |
| Structure | 41 input fields over 7 page(s) |
| Emails | 2 notification, 2 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | signatures, file uploads |

<details><summary>Fields (41)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 3 | `q3_nameOf` | fullname | Name of Adopter |  | Parts: first, last |
| 4 | `q4_emailOf4` | email | Email of Adopter |  |  |
| 5 | `q5_phoneNumber5` | phone | Phone Number of Adopter |  |  |
| 6 | `q6_addressOf6` | address | Address of Adopter |  | Subfields: state, zip, st1, city, st2 |
| 85 | `q85_uploadThe` | fileupload | Upload the front of your ID |  | Files (multiple), max 10854 KB |
| 86 | `q86_uploadThe86` | fileupload | Upload the back of your ID |  | Files (multiple), max 10854 KB |
| 27 | `q27_adoptionAgency` | fullname | Adoption Agency Details |  | Parts: first, last |
| 28 | `q28_email` | email | Email |  | read-only |
| 29 | `q29_phoneNumber` | phone | Phone Number |  |  |
| 30 | `q30_address` | address | Address |  | Subfields: state, zip, st1, city, st2; **hidden** |
| 10 | `q10_speciespet` | textbox | Species (Pet 1) |  |  |
| 8 | `q8_petName8` | textbox | Pet Name (Pet 1) |  |  |
| 47 | `q47_breedpet` | textbox | Breed (Pet 1) |  |  |
| 9 | `q9_microchipNumber9` | textbox | Microchip Number (Pet 1) |  |  |
| 13 | `q13_dateOf13` | textbox | Date of Birth (estimated) (Pet 1) |  |  |
| 15 | `q15_sexpet` | dropdown | Sex (Pet 1) |  | Options: Male / Female |
| 14 | `q14_descriptionpet` | textarea | Description (Pet 1) |  |  |
| 17 | `q17_medicalTests17` | matrix | Medical Tests and Vaccination (Pet 1) |  | Matrix (Dynamic) rows: FIV / FELV / Anti-Rabies / PCH/Tricat / Others (please provide details); cols: Date / Result/Details |
| 18 | `q18_otherConditions18` | textarea | Other conditions that the pet has or any other medical information that the adopter should know about (Pet 1) |  |  |
| 49 | `q49_additionalAttachments49` | fileupload | Additional Attachments (Pet 1) |  | Files (multiple), max 10854 KB |
| 55 | `q55_addAnother` | dropdown | Add another pet? | Yes | Options: Yes / No |
| 67 | `q67_speciespet67` | textbox | Species (Pet 2) |  |  |
| 66 | `q66_petName` | textbox | Pet Name (Pet 2) |  |  |
| 65 | `q65_breedpet65` | textbox | Breed (Pet 2) |  |  |
| 64 | `q64_microchipNumber64` | textbox | Microchip Number (Pet 2) |  |  |
| 63 | `q63_dateOf` | textbox | Date of Birth (estimated) (Pet 2) |  |  |
| 62 | `q62_sexpet62` | dropdown | Sex (Pet 2) |  | Options: Male / Female |
| 61 | `q61_descriptionpet61` | textarea | Description (Pet 2) |  |  |
| 59 | `q59_medicalTests` | matrix | Medical Tests and Vaccination (Pet 2) |  | Matrix (Dynamic) rows: FIV / FELV / Anti-Rabies / PCH / Others (please provide details); cols: Date / Result/Details |
| 58 | `q58_otherConditions` | textarea | Other conditions that the pet has or any other medical information that the adopter should know about (Pet 2) |  |  |
| 57 | `q57_additionalAttachments` | fileupload | Additional Attachments (Pet 2) |  | Files (multiple), max 10854 KB |
| 21 | `q21_adoptionFee21` | textbox | Adoption Fee For 1 Pet |  |  |
| 76 | `q76_adoptersSignature76` | signature | Adopter's Signature |  |  |
| 25 | `q25_date` | datetime | Date |  | Format mmddyyyy (lite) |
| 24 | `q24_petootisRescuer` | signature | Petooti's Rescuer Signature |  |  |
| 26 | `q26_date26` | datetime | Date |  | Format mmddyyyy (lite) |
| 78 | `q78_adoptionFee78` | textbox | Adoption Fee For 2 Pets |  |  |
| 23 | `q23_adoptersSignature` | signature | Adopter's Signature |  |  |
| 75 | `q75_date75` | datetime | Date |  | Format mmddyyyy (lite) |
| 74 | `q74_ittyBitty74` | signature | Petooti's Rescuer Signature |  |  |
| 73 | `q73_date73` | datetime | Date |  | Format mmddyyyy (lite) |

</details>

<details><summary>Conditional logic (14)</summary>

- *page*: if "Add another pet?" equals "No" then hidePage page-4
- *page*: if "Add another pet?" equals "No" then hidePage page-6
- *page*: if "Add another pet?" equals "No" then skipTo page-5
- *page*: if "Add another pet?" equals "Yes" then hidePage page-5
- *page*: if "Add another pet?" equals "Yes" then skipTo page-4
- *email*: if "Add another pet?" notEquals "No" OR "Add another pet?" equals "Yes" then send autorespond "Autoresponder 2 Pets"
- *email*: if "Add another pet?" notEquals "No" OR "Add another pet?" equals "Yes" then send notification "Notification 2 Pets"
- *email*: if "Add another pet?" notEquals "Yes" AND "Add another pet?" equals "No" then send notification "Notification 1 Pet"
- *email*: if "Add another pet?" notEquals "Yes" AND "Add another pet?" equals "No" then send autorespond "Autoresponder 1 pet"
- *email*: if "Add another pet?" equals "No" then send autorespond "Autoresponder 1 pet"
- *email*: if "Add another pet?" equals "Yes" then send autorespond "Autoresponder 2 Pets"
- *email*: if "Add another pet?" equals "Yes" AND "Email" is filled then send notification "Notification 2 Pets"
- *email*: if "Email" equals (a specific email address, redacted) then send notification "Notification 2 Pets"
- *field*: if "Date" is filled OR "Adopter's Signature" is filled then show "Adopter's Signature"; show "Date"

</details>

### Welfare Check Form (enabled)

| | |
|---|---|
| Form ID | `232852081487461` |
| URL | https://form.jotform.com/232852081487461 |
| Submissions | 1 (last: 2023-10-13 04:49:03) |
| Created / updated | 2023-10-13 / 2024-07-20 |
| Structure | 34 input fields over 8 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | signatures, file uploads |

<details><summary>Fields (34)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 103 | `q103_yourName` | fullname | Your Name |  | Parts: first, last |
| 135 | `q135_dateOf` | datetime | Date of visit: |  | Format mmddyyyy (lite) |
| 20 | `q20_fullName20` | fullname | Full Name | Yes | Parts: first, last |
| 87 | `q87_phoneNumber87` | phone | Phone Number | Yes |  |
| 6 | `q6_email6` | email | E-mail | Yes |  |
| 7 | `q7_address7` | address | Address where animals are currently | Yes | Subfields: st1, st2, city |
| 19 | `q19_pleaseList19` | textarea | Please list all people living in the household (Include Name, Relationship, Gender and Age) | Yes |  |
| 80 | `q80_numberOf` | textbox | Number of Animals? | Yes |  |
| 107 | `q107_species` | checkbox | Species | Yes | Options: Cat/s / Dog/s / Rabbit/s; allows "Other" |
| 108 | `q108_breed` | checkbox | Breed | Yes | Options: Domestic Short Hair / Domestic Long Hair; allows "Other" |
| 109 | `q109_nameAnd` | textbox | Name and identification (if applicable) of animal/s | Yes |  |
| 113 | `q113_describeThe` | textarea | Describe the living environment for the animals: | Yes |  |
| 89 | `q89_pleaseSelect` | checkbox | Please select all that apply: | Yes | Options: Garden / Balcony / Unhinged windows / Other, please explain |
| 90 | `q90_ifYou90` | textbox | If you selected other, please explain | Yes |  |
| 83 | `q83_willThe83` | radio | Is the balcony/garden be secured and cat proofed? | Yes | Options: Yes / No |
| 137 | `q137_areThe137` | radio | Are the animals being kept indoors at all times if they are indoor animals? | Yes | Options: Yes / No / NA |
| 114 | `q114_isThere` | radio | Is there access to clean water and appropriate food for each animals? |  | Options: Yes / No; allows "Other" |
| 115 | `q115_areThe` | radio | Are the animals receiving any necessary medical care or treatment? |  | Options: Yes / No; allows "Other" |
| 23 | `q23_areThe23` | textarea | Are the animals showing signs of stress or behaviour issues? Please give rationale: | Yes |  |
| 118 | `q118_describeThe118` | textarea | Describe the interactions between animal and humans: | Yes |  |
| 119 | `q119_isThere119` | radio | Is there enrichment provided for mental stimulation? | Yes | Options: Yes / No; allows "Other" |
| 124 | `q124_pleaseProvide` | textarea | Please provide detail: | Yes |  |
| 125 | `q125_attachPictures` | fileupload | Attach pictures / send separatley if any issues uploading: |  | Files (multiple), max 10854 KB |
| 128 | `q128_isThere128` | radio | Is there emergency plans in place in case of evacuation or unforeseen circumstances? | Yes | Options: Yes / No; allows "Other" |
| 129 | `q129_provideEmergency` | textbox | Provide emergency contact information for the foster caregiver: | Yes |  |
| 131 | `q131_overallAssessment` | textarea | Overall assessment of animal welfare (provide recommendations if necessary): | Yes |  |
| 133 | `q133_followUp` | textarea | Follow up plan or actions required: | Yes |  |
| 134 | `q134_picturesOf` | fileupload | Pictures of the animals (or attach separatley) |  | Files (multiple), max 10854 KB |
| 78 | `q78_fosterSignature` | signature | Foster Signature |  |  |
| 96 | `q96_name96` | fullname | Name |  | Parts: first, last |
| 73 | `q73_date73` | datetime | Date | Yes | Format mmddyyyy |
| 93 | `q93_representiveSignature` | signature | Representive Signature |  |  |
| 95 | `q95_name` | fullname | Name |  | Parts: first, last |
| 94 | `q94_date` | datetime | Date |  | Format mmddyyyy |

</details>


### USA Adoption Form & Agreement (enabled)

| | |
|---|---|
| Form ID | `223021100571435` |
| URL | https://form.jotform.com/223021100571435 |
| Submissions | 0 (last: never) |
| Created / updated | 2022-10-30 / 2025-03-07 |
| Structure | 84 input fields over 3 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | signatures, file uploads |

<details><summary>Fields (84)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 119 | `q119_yourFull` | fullname | Your Full Name | Yes | Parts: first, last |
| 120 | `q120_yourAddress` | address | Your Address | Yes | Subfields: st1, st2, city, country, state |
| 25 | `q25_howLong25` | textbox | How long have you lived at this address?: | Yes |  |
| 121 | `q121_homePhone121` | phone | Home Phone Number |  |  |
| 122 | `q122_cellPhone122` | phone | Cell Phone Number | Yes |  |
| 28 | `q28_nameAnd` | textarea | Name and Address of Employer: |  |  |
| 123 | `q123_workPhone123` | phone | Work Phone Number |  |  |
| 124 | `q124_email124` | email | E-mail | Yes |  |
| 169 | `q169_pleaseTell169` | textarea | Please tell us about yourself, your home set-up and experience with pets (past and current). | Yes |  |
| 166 | `q166_uploadThe` | fileupload | Upload the FRONT of your ID | Yes | Files (multiple), max 10854 KB |
| 167 | `q167_uploadThe167` | fileupload | Upload the BACK of your ID | Yes | Files (multiple), max 10854 KB |
| 36 | `q36_doYou36` | radio | Do you agree to pay the adoption fee? | Yes | Options: Yes / No |
| 43 | `q43_typeOf` | dropdown | Type of Home: | Yes | Options: House / Apartment / Condo / Mobile Home |
| 160 | `q160_doYou` | radio | Do you own your home? | Yes | Options: Yes / No |
| 161 | `q161_doYou161` | radio | Do you have a garden/balcony? |  | Options: Garden / Balcony / Both |
| 162 | `q162_ifYes162` | textarea | If yes, do you plan on letting your cat out on to the balcony or outdoors? |  |  |
| 38 | `q38_areYou38` | radio | Are you planning on moving within the next 12 months? | Yes | Options: Yes / No |
| 39 | `q39_ifYes` | textarea | If yes, what are your plans for your pets if you move? |  |  |
| 125 | `q125_birthDate125` | birthdate | Birth Date | Yes |  |
| 49 | `q49_nameAnd49` | textarea | Name and age of ALL occupants in household (including yourself): | Yes |  |
| 50 | `q50_ifNo50` | radio | If no children, do you plan on having children or will children be visiting the household frequently? | Yes | Options: Yes / No |
| 152 | `q152_whatIs` | checkbox | What is your reason for wanting to adopt a cat? | Yes | Options: Housepet / Mouse Patrol / Companion / Companion for pet / Gift / Other |
| 153 | `q153_ifOther153` | textarea | If other, please explain: |  |  |
| 117 | `q117_howMany` | textarea | How many total hours will your new adopted pet be left alone during the day? | Yes |  |
| 146 | `q146_ifAdopting` | textarea | If adopting a kitten, where would the kitten be kept when alone? |  |  |
| 147 | `q147_areYou` | radio | Are you planning on declawing your new cat or kitten? | Yes | Options: Yes / No / Maybe |
| 148 | `q148_areYour148` | radio | Are your current cats declawed? | Yes | Options: Yes / No / N/A |
| 51 | `q51_areAny` | radio | Are any members of your household allergic to animals? | Yes | Options: Yes / No |
| 52 | `q52_ifYes52` | textarea | If yes, please describe: |  |  |
| 126 | `q126_whoWill126` | textarea | Who will have chief legal responsibility for the care of your new pet? | Yes |  |
| 54 | `q54_overThe` | dropdown | Over the past 5 years, how many pets have you owned? (Include current pets) | Yes | Options: 0 / 1 / 2 / 3 / 4 / 5 / 6+ |
| 55 | `q55_listEach` | textarea | List each individually including breed, age, still living with you? (if not, why?) |  |  |
| 56 | `q56_haveYou56` | radio | Have you and your spouse (if applicable) ever owned a cat together? | Yes | Options: Yes / No / N/A |
| 115 | `q115_ifYes115` | textarea | If yes, when? |  |  |
| 151 | `q151_haveYou` | radio | Have you ever lost or given away a pet? | Yes | Options: Yes / No |
| 58 | `q58_ifYou58` | textarea | If you currently own a dog or cat, how does he/she react to new cats? |  |  |
| 59 | `q59_areYour` | radio | Are your present pets up-to-date on their annual vaccines? | Yes | Options: Yes / No / N/A |
| 60 | `q60_ifNo60` | textarea | If no, please explain: |  |  |
| 61 | `q61_areYour61` | radio | Are your present pets spayed or neutered? | Yes | Options: Yes / No / N/A |
| 62 | `q62_ifNo62` | textarea | If no, please explain. |  |  |
| 63 | `q63_wereYour` | radio | Were your previous pets spayed or neutered? | Yes | Options: Yes / No / N/A |
| 64 | `q64_ifNo64` | textarea | If no, please explain. |  |  |
| 127 | `q127_howMuch` | textarea | How much are you financially prepared to spend for routine/emergency medical care, licensing, etc? | Yes |  |
| 66 | `q66_whatPlans` | textarea | What plans do you have for your new pet when you are on vacation? | Yes |  |
| 145 | `q145_whichCats` | textarea | Which cat(s) will you be adopting? | Yes |  |
| 69 | `q69_ageOf` | checkbox | Age of cat you would consider adopting: (check all that apply) | Yes | Options: Kitten / Young / Adult / Special Needs / Senior |
| 159 | `q159_pleaseSelect159` | checkbox | Please select your preferences: |  | Options: Short haired breed / Long haired/exotic breed / Male / Female / Any of the above |
| 75 | `q75_canwillYou` | radio | Can/Will you provide your cat with monthly flea/tick prevention? | Yes | Options: Yes / No |
| 164 | `q164_howMuch164` | textbox | How much are you prepared to spend on relocating your cat(s) with you when you leave? |  |  |
| 128 | `q128_whoIs128` | textarea | Who is your current or most recent veterinarian? Please provide their NAME and PHONE NUMBER: PLEASE MAKE SURE... | Yes |  |
| 149 | `q149_ifYour149` | checkbox | If your cat displays behavioral problems (such as poor litter box habits, inappropriate scratching etc.) how ... | Yes | Options: Contact a Professional / Use a book / Personal Knowledge / Other |
| 154 | `q154_ifOther154` | textarea | If other, please explain: |  |  |
| 150 | `q150_whatType` | checkbox | What type of solution would you be willing to try if housebreaking accidents continue after the first week (c... | Yes | Options: Move box to new location / Try a different litter / Clean box more often / Have cat examined by vet / Use a cat door / Return Cat / None / Other |
| 155 | `q155_ifOther155` | textarea | If other, please explain: |  |  |
| 129 | `q129_whatBrand` | textarea | What brand of cat food do you plan on feeding your new cat? | Yes |  |
| 91 | `q91_isYour` | radio | Is your entire immediate family in agreement with the decision to bring a new pet into your home? | Yes | Options: Yes / No |
| 131 | `q131_ifAnyone131` | textarea | If anyone is NOT, please explain: |  |  |
| 93 | `q93_areYou93` | radio | Are you prepared to commit to a pet for 15 - 20 years (average life span)? | Yes | Options: Yes / No |
| 94 | `q94_areYou94` | radio | Are you willing to allow one of our local representatives to make future visits to your home? | Yes | Options: Yes / No |
| 95 | `q95_haveYou95` | radio | Have you or any member of your household ever been charged with cruelty to animals or negligence in animal ca... | Yes | Options: Yes / No |
| 132 | `q132_ifYes132` | textarea | If yes, please describe: |  |  |
| 97 | `q97_haveYou97` | radio | Have you ever adopted or tried to adopt a pet before? If yes, fill out info below. | Yes | Options: Yes / No |
| 133 | `q133_rescueInformation133` | fullname | Rescue Information |  | Parts: first, last |
| 134 | `q134_rescuesPhone` | phone | Rescue's Phone Number |  |  |
| 135 | `q135_whyAre` | textarea | Why are you choosing to adopt vs. buying from a pet store or breeder? | Yes |  |
| 136 | `q136_ifOther` | textarea | If other, please explain: |  |  |
| 100 | `q100_whereWill100` | dropdown | Where will your cat spend most of his/her time? | Yes | Options: Indoors Only / Outdoors Only / Indoors and Outdoors / Barn Cat / Basement/Garage / Confined |
| 156 | `q156_ifYou` | radio | If you selected outdoor, would your cat be supervised? |  | Options: Yes / No |
| 138 | `q138_whereWill138` | textarea | Where will your cat eat? | Yes |  |
| 139 | `q139_whereWill139` | textarea | Where will your cat sleep? | Yes |  |
| 107 | `q107_reference1107` | textbox | Reference #1 | Yes |  |
| 140 | `q140_reference` | phone | Reference # 1 Phone Number | Yes |  |
| 108 | `q108_reference2108` | textbox | Reference #2 | Yes |  |
| 141 | `q141_reference2` | phone | Reference #2 Phone Number | Yes |  |
| 109 | `q109_reference3109` | textbox | Reference #3 | Yes |  |
| 142 | `q142_reference142` | phone | Reference # 3 Phone Number | Yes |  |
| 143 | `q143_ifThere` | textarea | If there is anything else you think we should know, please note it here. |  |  |
| 177 | `q177_vetCosts177` | textbox | Vet Costs Reimbursments (AED) |  |  |
| 178 | `q178_signatureOf` | signature | Signature of Adopter |  |  |
| 179 | `q179_typeName179` | textbox | Type Name of Adopter |  |  |
| 181 | `q181_date` | datetime | Date |  | Format mmddyyyy (lite) |
| 182 | `q182_signatureOf182` | signature | Signature of Rescuer/Owner |  | **hidden** |
| 183 | `q183_typeName` | textbox | Type name of Rescuer/Owner |  | **hidden** |
| 184 | `q184_date184` | datetime | Date |  | Format mmddyyyy (lite); **hidden** |

</details>


### USA 1 Pet Adoption Contract (enabled)

| | |
|---|---|
| Form ID | `223056984117459` |
| URL | https://form.jotform.com/223056984117459 |
| Submissions | 0 (last: never) |
| Created / updated | 2022-11-02 / 2022-11-02 |
| Structure | 41 input fields over 7 page(s) |
| Emails | 2 notification, 0 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | signatures, file uploads |

<details><summary>Fields (41)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 3 | `q3_nameOf` | fullname | Name of Adopter |  | Parts: first, last |
| 4 | `q4_emailOf4` | email | Email of Adopter |  |  |
| 5 | `q5_phoneNumber5` | phone | Phone Number of Adopter |  |  |
| 6 | `q6_addressOf6` | address | Address of Adopter |  | Subfields: state, zip, st1, city, st2 |
| 27 | `q27_adoptionAgency` | fullname | Adoption Agency Details |  | Parts: first, last |
| 28 | `q28_email` | email | Email |  | read-only |
| 29 | `q29_phoneNumber` | phone | Phone Number |  |  |
| 30 | `q30_address` | address | Address |  | Subfields: ; **hidden** |
| 87 | `q87_uploadThe` | fileupload | Upload the front of your ID |  | Files (multiple), max 10854 KB |
| 88 | `q88_fileUpload88` | fileupload | Upload the back of your ID |  | Files (multiple), max 10854 KB |
| 10 | `q10_speciespet` | textbox | Species (Pet 1) |  |  |
| 8 | `q8_petName8` | textbox | Pet Name (Pet 1) |  |  |
| 47 | `q47_breedpet` | textbox | Breed (Pet 1) |  |  |
| 9 | `q9_microchipNumber9` | textbox | Microchip Number (Pet 1) |  |  |
| 13 | `q13_dateOf13` | textbox | Date of Birth (estimated) (Pet 1) |  |  |
| 15 | `q15_sexpet` | dropdown | Sex (Pet 1) |  | Options: Male / Female |
| 14 | `q14_descriptionpet` | textarea | Description (Pet 1) |  |  |
| 17 | `q17_medicalTests17` | matrix | Medical Tests and Vaccination (Pet 1) |  | Matrix (Dynamic) rows: FIV / FELV / Anti-Rabies / PCH/Tricat / Others (please provide details); cols: Date / Result/Details |
| 18 | `q18_otherConditions18` | textarea | Other conditions that the pet has or any other medical information that the adopter should know about (Pet 1) |  |  |
| 49 | `q49_additionalAttachments49` | fileupload | Additional Attachments (Pet 1) |  | Files (multiple), max 10854 KB |
| 55 | `q55_addAnother` | dropdown | Add another pet? | Yes | Options: Yes / No |
| 67 | `q67_speciespet67` | textbox | Species (Pet 2) |  |  |
| 66 | `q66_petName` | textbox | Pet Name (Pet 2) |  |  |
| 65 | `q65_breedpet65` | textbox | Breed (Pet 2) |  |  |
| 64 | `q64_microchipNumber64` | textbox | Microchip Number (Pet 2) |  |  |
| 63 | `q63_dateOf` | textbox | Date of Birth (estimated) (Pet 2) |  |  |
| 62 | `q62_sexpet62` | dropdown | Sex (Pet 2) |  | Options: Male / Female |
| 61 | `q61_descriptionpet61` | textarea | Description (Pet 2) |  |  |
| 59 | `q59_medicalTests` | matrix | Medical Tests and Vaccination (Pet 2) |  | Matrix (Dynamic) rows: FIV / FELV / Anti-Rabies / PCH / Others (please provide details); cols: Date / Result/Details |
| 58 | `q58_otherConditions` | textarea | Other conditions that the pet has or any other medical information that the adopter should know about (Pet 2) |  |  |
| 57 | `q57_additionalAttachments` | fileupload | Additional Attachments (Pet 2) |  | Files (multiple), max 10854 KB |
| 21 | `q21_adoptionFee21` | textbox | Adoption Fee For 1 Pet |  |  |
| 76 | `q76_adoptersSignature76` | signature | Adopter's Signature |  |  |
| 25 | `q25_date` | datetime | Date |  | Format mmddyyyy (lite) |
| 24 | `q24_petootisRescuer24` | signature | Petooti's Rescuer Signature |  |  |
| 26 | `q26_date26` | datetime | Date |  | Format mmddyyyy (lite) |
| 78 | `q78_adoptionFee78` | textbox | Adoption Fee For 2 Pets |  |  |
| 23 | `q23_adoptersSignature` | signature | Adopter's Signature |  |  |
| 75 | `q75_date75` | datetime | Date |  | Format mmddyyyy (lite) |
| 74 | `q74_petootisRescuer` | signature | Petooti's Rescuer Signature |  |  |
| 73 | `q73_date73` | datetime | Date |  | Format mmddyyyy (lite) |

</details>

<details><summary>Conditional logic (12)</summary>

- *page*: if "Add another pet?" equals "No" then hidePage page-7
- *page*: if "Add another pet?" equals "No" then hidePage page-9
- *page*: if "Add another pet?" equals "No" then skipTo page-8
- *page*: if "Add another pet?" equals "Yes" then hidePage page-8
- *page*: if "Add another pet?" equals "Yes" then skipTo page-7
- *email*: if "Add another pet?" notEquals "No" OR "Add another pet?" equals "Yes" then send notification "Notification 2 Pets"
- *email*: if "Add another pet?" notEquals "Yes" AND "Add another pet?" equals "No" then send notification "Notification 1 Pet"
- *email*: if "Add another pet?" equals "No" then send autorespond "Notification 1 Pet"
- *email*: if "Add another pet?" equals "Yes" then send autorespond "Notification 1 Pet"
- *email*: if "Add another pet?" equals "Yes" AND "Email" is filled then send notification "Notification 2 Pets"
- *email*: if "Email" equals (a specific email address, redacted) then send notification "Notification 2 Pets"
- *field*: if "Date" is filled OR "Adopter's Signature" is filled then show "Adopter's Signature"; show "Date"

</details>

### Clone of Adoption Form and References (enabled)

| | |
|---|---|
| Form ID | `240266010417040` |
| URL | https://form.jotform.com/240266010417040 |
| Submissions | 0 (last: never) |
| Created / updated | 2024-01-27 / 2024-01-27 |
| Structure | 49 input fields over 1 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | file uploads, widgets |

<details><summary>Fields (49)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 166 | `q166_whichCat` | textbox | Which cat are your applying for? |  |  |
| 119 | `q119_yourFull` | fullname | Your Full Name | Yes | Parts: first, last |
| 120 | `q120_yourHome` | address | Your Home Address | Yes | Subfields: st1, st2, city, state, zip, country |
| 25 | `q25_howLong25` | textbox | How long have you lived at this address?: | Yes |  |
| 121 | `q121_homePhone121` | phone | Home Phone Number |  |  |
| 122 | `q122_mobileNumber` | phone | Mobile Number |  |  |
| 28 | `q28_nameAnd` | textarea | Name and Address of Employer: |  |  |
| 123 | `q123_workPhone123` | phone | Work Phone Number |  |  |
| 30 | `q30_upUntil` | textbox | Up until what time of night can we contact you via phone? | Yes |  |
| 124 | `q124_email124` | email | E-mail | Yes |  |
| 169 | `q169_pleaseUpload` | fileupload | Please upload ID |  | Files (multiple), max 10854 KB |
| 170 | `q170_pleaseUpload170` | fileupload | Please upload ID |  | Files (multiple), max 10854 KB |
| 158 | `q158_pleaseSelect158` | checkbox | Please select your two nearest airports (only applicable if you are adopting from overseas) |  | Options: London Heathrow / London Gatwick / Manchester / Edinburgh / Glasgow / Paris / Amsterdam / Frankfurt; allows "Other" |
| 36 | `q36_areYou36` | radio | Are you able to afford the advertised adoption fee? | Yes | Options: Yes / No |
| 147 | `q147_areYou` | radio | Are you planning on declawing your new cat or kitten? | Yes | Options: Yes / No / Maybe |
| 148 | `q148_areYour148` | radio | Are your current cats declawed? | Yes | Options: Yes / No / N/A |
| 126 | `q126_whoWill` | textarea | Who will have chief responsibility for the care of your new pet? | Yes |  |
| 59 | `q59_areYour` | radio | Are your present pets up-to-date on their annual vaccines? | Yes | Options: Yes / No / N/A |
| 60 | `q60_ifNo60` | textarea | If no, please explain: |  |  |
| 127 | `q127_howMuch` | textarea | How much are you financially prepared to spend for routine/emergency medical care, licensing, etc? | Yes |  |
| 66 | `q66_whatPlans` | textarea | What plans do you have for your new pet when you are on vacation? | Yes |  |
| 75 | `q75_canwillYou` | radio | Can/Will you provide your cat with monthly flea/tick prevention? | Yes | Options: Yes / No |
| 128 | `q128_whoIs128` | textarea | Who is your current or most recent veterinarian? Please provide their NAME and PHONE NUMBER: PLEASE MAKE SURE... | Yes |  |
| 149 | `q149_ifYour149` | checkbox | If your cat displays behavioral problems (such as poor litter box habits, inappropriate scratching etc.) how ... | Yes | Options: Contact a Professional / Use a book / Personal Knowledge / Other |
| 154 | `q154_ifOther154` | textarea | If other, please explain: |  |  |
| 150 | `q150_whatType` | checkbox | What type of solution would you be willing to try if housebreaking accidents continue after the first week (c... | Yes | Options: Move box to new location / Try a different litter / Clean box more often / Have cat examined by vet / Use a cat door / Return Cat / None / Other |
| 155 | `q155_ifOther155` | textarea | If other, please explain: |  |  |
| 129 | `q129_whatBrand` | textarea | What brand of cat food do you plan on feeding your new cat? | Yes |  |
| 94 | `q94_areYou94` | radio | Are you willing to allow one of our local representatives to make future visits to your home? | Yes | Options: Yes / No |
| 95 | `q95_haveYou95` | radio | Have you or any member of your household ever been charged with cruelty to animals or negligence in animal ca... | Yes | Options: Yes / No |
| 132 | `q132_ifYes132` | textarea | If yes, please describe: |  |  |
| 97 | `q97_haveYou97` | radio | Have you ever adopted or tried to adopt a pet before? If yes, fill out info below. | Yes | Options: Yes / No |
| 133 | `q133_rescueInformation133` | fullname | Rescue Information |  | Parts: first, last |
| 134 | `q134_rescuesPhone` | phone | Rescue's Phone Number |  |  |
| 100 | `q100_whereWill100` | dropdown | Where will your cat spend most of his/her time? | Yes | Options: Indoors Only / Outdoors Only / Indoors and Outdoors / Barn Cat / Basement/Garage / Confined |
| 156 | `q156_ifYou` | radio | If you selected outdoor, would your cat be supervised? |  | Options: Yes / No |
| 138 | `q138_whereWill138` | textarea | Where will your cat eat? |  |  |
| 139 | `q139_whereWill139` | textarea | Where will your cat sleep? | Yes |  |
| 107 | `q107_reference1107` | textbox | Reference #1 |  |  |
| 140 | `q140_reference` | phone | Reference # 1 Phone Number |  |  |
| 171 | `q171_reference1` | email | Reference #1 Email Address | Yes |  |
| 108 | `q108_reference2108` | textbox | Reference #2 |  |  |
| 141 | `q141_reference2` | phone | Reference #2 Phone Number |  |  |
| 172 | `q172_reference2172` | email | Reference #2 Email |  |  |
| 109 | `q109_reference3109` | textbox | Reference #3 |  |  |
| 142 | `q142_reference142` | phone | Reference # 3 Phone Number |  |  |
| 173 | `q173_reference3` | email | Reference #3 Email |  |  |
| 143 | `q143_ifThere` | textarea | If there is anything else you think we should know, please note it here. |  |  |
| 160 | `q160_seeOur` | widget | See our latest updates |  | Widget: Social Follow |

</details>

<details><summary>Conditional logic (2)</summary>

- *email*: if field 165 notEquals "Joy Afif" then send notification "Notification 1"
- *email*: if field 165 equals "Joy Afif" then send notification "Notification 1"; send notification "Notification 1"

</details>

### Mask Covers For A Cause (disabled)

| | |
|---|---|
| Form ID | `201255600082442` |
| URL | https://form.jotform.com/ibktails/face-mask-order-form |
| Submissions | 325 (last: 2021-05-12 02:46:56) |
| Created / updated | 2020-05-05 / 2021-05-19 |
| Structure | 7 input fields over 1 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | google; webhooks: none |
| After submit | thank-you message |
| Notable | payments, widgets |

<details><summary>Fields (7)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 3 | `q3_name` | fullname | Name | Yes | Parts: first, last |
| 7 | `q7_phoneNumber` | phone | Mobile Number | Yes |  |
| 12 | `q12_email` | email | Email | Yes | confirm email |
| 9 | `q9_address` | address | Address | Yes | Subfields: city, st2, state, st1 |
| 17 | `q17_whichMethod` | dropdown | Which method do you prefer to receive your masks? | Yes | Options: Delivery / Pick-up |
| 10 | `q10_selectYour10` | payment | Select your face mask cover from the selection below. Click on image to enlarge: |  |  |
| 13 | `q13_input13` | widget |  |  | Widget: Preview Before Submit |

</details>


### International Rehoming Adoption Form (disabled)

| | |
|---|---|
| Form ID | `202294774514458` |
| URL | https://form.jotform.com/202294774514458 |
| Submissions | 75 (last: 2021-08-16 15:07:27) |
| Created / updated | 2020-08-17 / 2022-10-30 |
| Structure | 76 input fields over 1 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | widgets |

<details><summary>Fields (76)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 165 | `q165_whichRescuer` | dropdown | Which rescuer have you been speaking to? | Yes | Options: Amy Adams / Bénédicte Capdevielle / Christine Veall / Deborah Cohen / Dalia Kazoun / Joy Afif / Lucille Charrier / Mia Saaliha Esat |
| 119 | `q119_yourFull` | fullname | Your Full Name | Yes | Parts: first, last |
| 120 | `q120_yourHome` | address | Your Home Address | Yes | Subfields: st1, st2, city, state, zip, country |
| 25 | `q25_howLong25` | textbox | How long have you lived at this address?: | Yes |  |
| 121 | `q121_homePhone121` | phone | Home Phone Number |  |  |
| 122 | `q122_cellPhone122` | phone | Cell Phone Number |  |  |
| 28 | `q28_nameAnd` | textarea | Name and Address of Employer: |  |  |
| 123 | `q123_workPhone123` | phone | Work Phone Number |  |  |
| 30 | `q30_upUntil` | textbox | Up until what time of night can we contact you via phone? | Yes |  |
| 124 | `q124_email124` | email | E-mail | Yes |  |
| 158 | `q158_pleaseSelect158` | checkbox | Please select your two nearest airports (only applicable if you are adopting from overseas) |  | Options: London Heathrow / London Gatwick / Manchester / Edinburgh / Glasgow / Paris / Amsterdam / Frankfurt / Boston / New York City / Washington, DC; allows "Other" |
| 36 | `q36_areYou36` | radio | Are you able to afford the adoption fee? | Yes | Options: Yes / No |
| 38 | `q38_areYou38` | radio | Are you planning on moving within the next 12 months? | Yes | Options: Yes / No |
| 39 | `q39_ifYes` | textarea | If yes, what are your plans for your pets if you move? |  |  |
| 125 | `q125_birthDate125` | birthdate | Birth Date |  |  |
| 41 | `q41_doYou41` | radio | Do you own your own home? |  | Options: Yes / No |
| 116 | `q116_ifNo116` | textarea | If no, name and phone # of landlord: |  |  |
| 43 | `q43_typeOf` | dropdown | Type of Dwelling: |  | Options: House / Apartment / Condo / Mobile Home |
| 49 | `q49_nameAnd49` | textarea | Name and age of ALL occupants in household (including yourself): | Yes |  |
| 50 | `q50_ifNo50` | radio | If no children, do you plan on having children or will children be visiting the household frequently? |  | Options: Yes / No |
| 152 | `q152_whatIs` | checkbox | What is your reason for wanting to adopt a cat? |  | Options: Housepet / Mouse Patrol / Companion / Companion for pet / Gift / Other |
| 153 | `q153_ifOther153` | textarea | If other, please explain: |  |  |
| 117 | `q117_howMany` | textarea | How many total hours will your new pet be left alone during the day? | Yes |  |
| 146 | `q146_ifAdopting` | textarea | If adopting a kitten, where would the kitten be kept when alone? |  |  |
| 147 | `q147_areYou` | radio | Are you planning on declawing your new cat or kitten? | Yes | Options: Yes / No / Maybe |
| 148 | `q148_areYour148` | radio | Are your current cats declawed? | Yes | Options: Yes / No / N/A |
| 51 | `q51_areAny` | radio | Are any members of your household allergic to animals? | Yes | Options: Yes / No |
| 52 | `q52_ifYes52` | textarea | If yes, please describe: |  |  |
| 126 | `q126_whoWill` | textarea | Who will have chief responsibility for the care of your new pet? | Yes |  |
| 54 | `q54_overThe` | dropdown | Over the past 5 years, how many pets have you owned? (Include current pets) | Yes | Options: 0 / 1 / 2 / 3 / 4 / 5 / 6+ |
| 55 | `q55_listEach` | textarea | List each individually including breed, age, still living with you? (if not, why?) |  |  |
| 56 | `q56_haveYou56` | radio | Have you and your spouse (if applicable) ever owned a cat together? | Yes | Options: Yes / No / N/A |
| 115 | `q115_ifYes115` | textarea | If yes, when? |  |  |
| 151 | `q151_haveYou` | radio | Have you ever lost or given away a pet? | Yes | Options: Yes / No |
| 58 | `q58_ifYou58` | textarea | If you currently own a dog or cat, how does he/she react to new cats? |  |  |
| 59 | `q59_areYour` | radio | Are your present pets up-to-date on their annual vaccines? | Yes | Options: Yes / No / N/A |
| 60 | `q60_ifNo60` | textarea | If no, please explain: |  |  |
| 61 | `q61_areYour61` | radio | Are your present pets spayed or neutered? | Yes | Options: Yes / No / N/A |
| 62 | `q62_ifNo62` | textarea | If no, please explain. |  |  |
| 63 | `q63_wereYour` | radio | Were your previous pets spayed or neutered? | Yes | Options: Yes / No / N/A |
| 64 | `q64_ifNo64` | textarea | If no, please explain. |  |  |
| 127 | `q127_howMuch` | textarea | How much are you financially prepared to spend for routine/emergency medical care, licensing, etc? | Yes |  |
| 66 | `q66_whatPlans` | textarea | What plans do you have for your new pet when you are on vacation? | Yes |  |
| 145 | `q145_whichCats145` | textarea | Which cat(s) are you interested in adopting? | Yes |  |
| 69 | `q69_ageOf` | checkbox | Age of cat you would consider adopting: (check all that apply) | Yes | Options: Kitten / Young / Adult / Special Needs / Senior |
| 159 | `q159_pleaseSelect159` | checkbox | Please select your preferences: |  | Options: Short haired breed / Long haired/exotic breed / Male / Female / Any of the above |
| 75 | `q75_canwillYou` | radio | Can/Will you provide your cat with monthly flea/tick prevention? | Yes | Options: Yes / No |
| 128 | `q128_whoIs128` | textarea | Who is your current or most recent veterinarian? Please provide their NAME and PHONE NUMBER: PLEASE MAKE SURE... | Yes |  |
| 149 | `q149_ifYour149` | checkbox | If your cat displays behavioral problems (such as poor litter box habits, inappropriate scratching etc.) how ... | Yes | Options: Contact a Professional / Use a book / Personal Knowledge / Other |
| 154 | `q154_ifOther154` | textarea | If other, please explain: |  |  |
| 150 | `q150_whatType` | checkbox | What type of solution would you be willing to try if housebreaking accidents continue after the first week (c... | Yes | Options: Move box to new location / Try a different litter / Clean box more often / Have cat examined by vet / Use a cat door / Return Cat / None / Other |
| 155 | `q155_ifOther155` | textarea | If other, please explain: |  |  |
| 129 | `q129_whatBrand` | textarea | What brand of cat food do you plan on feeding your new cat? | Yes |  |
| 91 | `q91_isYour` | radio | Is your entire immediate family in agreement with the decision to bring a new pet into your home? | Yes | Options: Yes / No |
| 131 | `q131_ifAnyone131` | textarea | If anyone is NOT, please explain: |  |  |
| 93 | `q93_areYou93` | radio | Are you prepared to commit to a pet for 15 - 20 years (average life span)? | Yes | Options: Yes / No |
| 94 | `q94_areYou94` | radio | Are you willing to allow one of our local representatives to make future visits to your home? | Yes | Options: Yes / No |
| 95 | `q95_haveYou95` | radio | Have you or any member of your household ever been charged with cruelty to animals or negligence in animal ca... | Yes | Options: Yes / No |
| 132 | `q132_ifYes132` | textarea | If yes, please describe: |  |  |
| 97 | `q97_haveYou97` | radio | Have you ever adopted or tried to adopt a pet before? If yes, fill out info below. | Yes | Options: Yes / No |
| 133 | `q133_rescueInformation133` | fullname | Rescue Information |  | Parts: first, last |
| 134 | `q134_rescuesPhone` | phone | Rescue's Phone Number |  |  |
| 135 | `q135_whyAre` | textarea | Why are you choosing to adopt vs. buying from a pet store or breeder? |  |  |
| 136 | `q136_ifOther` | textarea | If other, please explain: |  |  |
| 100 | `q100_whereWill100` | dropdown | Where will your cat spend most of his/her time? | Yes | Options: Indoors Only / Outdoors Only / Indoors and Outdoors / Barn Cat / Basement/Garage / Confined |
| 156 | `q156_ifYou` | radio | If you selected outdoor, would your cat be supervised? |  | Options: Yes / No |
| 138 | `q138_whereWill138` | textarea | Where will your cat eat? | Yes |  |
| 139 | `q139_whereWill139` | textarea | Where will your cat sleep? | Yes |  |
| 107 | `q107_reference1107` | textbox | Reference #1 |  |  |
| 140 | `q140_reference` | phone | Reference # 1 Phone Number |  |  |
| 108 | `q108_reference2108` | textbox | Reference #2 |  |  |
| 141 | `q141_reference2` | phone | Reference #2 Phone Number |  |  |
| 109 | `q109_reference3109` | textbox | Reference #3 |  |  |
| 142 | `q142_reference142` | phone | Reference # 3 Phone Number |  |  |
| 143 | `q143_ifThere` | textarea | If there is anything else you think we should know, please note it here. |  |  |
| 160 | `q160_seeOur` | widget | See our latest updates |  | Widget: Social Follow |

</details>

<details><summary>Conditional logic (2)</summary>

- *email*: if "Which rescuer have you been speaking to?" notEquals "Joy Afif" then send notification "Notification 1"
- *email*: if "Which rescuer have you been speaking to?" equals "Joy Afif" then send notification "Notification 1"; send notification "Notification 1"

</details>

### UAE Adoption Form (disabled)

| | |
|---|---|
| Form ID | `202294841087458` |
| URL | https://form.jotform.com/202294841087458 |
| Submissions | 21 (last: 2021-07-25 10:48:05) |
| Created / updated | 2020-08-17 / 2021-11-19 |
| Structure | 79 input fields over 1 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | file uploads |

<details><summary>Fields (79)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 168 | `q168_typeA` | dropdown | Which rescuer have you been speaking to? | Yes | Options: Amy Adams / Bénédicte Capdevielle / Christine Veall / Dalia Kazoun / Lucille Charrier / Mia Saaliha Esat |
| 119 | `q119_yourFull` | fullname | Your Full Name | Yes | Parts: first, last |
| 120 | `q120_yourAddress` | address | Your Address | Yes | Subfields: st1, st2, city, country, state |
| 25 | `q25_howLong25` | textbox | How long have you lived at this address?: | Yes |  |
| 121 | `q121_homePhone121` | phone | Home Phone Number |  |  |
| 122 | `q122_cellPhone122` | phone | Cell Phone Number | Yes |  |
| 28 | `q28_nameAnd` | textarea | Name and Address of Employer: |  |  |
| 123 | `q123_workPhone123` | phone | Work Phone Number |  |  |
| 30 | `q30_upUntil` | textbox | Up until what time of night can we contact you via phone? | Yes |  |
| 124 | `q124_email124` | email | E-mail | Yes |  |
| 166 | `q166_uploadThe` | fileupload | Upload the FRONT of your Emirates ID | Yes | Files (multiple), max 10854 KB |
| 167 | `q167_uploadThe167` | fileupload | Upload the BACK of your Emirates ID | Yes | Files (multiple), max 10854 KB |
| 36 | `q36_areYou36` | radio | Are you able to afford the advertised adoption fee? | Yes | Options: Yes / No |
| 43 | `q43_typeOf` | dropdown | Type of Dwelling: | Yes | Options: House / Apartment / Condo / Mobile Home |
| 160 | `q160_doYou` | radio | Do you own your home? |  | Options: Yes / No |
| 161 | `q161_doYou161` | radio | Do you have a balcony? |  | Options: Yes / No |
| 162 | `q162_ifYes162` | textarea | If yes, do you plan on letting your cat out on to the balcony? |  |  |
| 38 | `q38_areYou38` | radio | Are you planning on moving within the next 12 months? | Yes | Options: Yes / No |
| 39 | `q39_ifYes` | textarea | If yes, what are your plans for your pets if you move? |  |  |
| 163 | `q163_uaeIsnt` | textarea | UAE isn’t forever for expats, we all have to leave one day. What are your plans for your pets when you leave? | Yes |  |
| 125 | `q125_birthDate125` | birthdate | Birth Date | Yes |  |
| 49 | `q49_nameAnd49` | textarea | Name and age of ALL occupants in household (including yourself): | Yes |  |
| 50 | `q50_ifNo50` | radio | If no children, do you plan on having children or will children be visiting the household frequently? | Yes | Options: Yes / No |
| 152 | `q152_whatIs` | checkbox | What is your reason for wanting to adopt a cat? | Yes | Options: Housepet / Mouse Patrol / Companion / Companion for pet / Gift / Other |
| 153 | `q153_ifOther153` | textarea | If other, please explain: |  |  |
| 117 | `q117_howMany` | textarea | How many total hours will your new pet be left alone during the day? | Yes |  |
| 146 | `q146_ifAdopting` | textarea | If adopting a kitten, where would the kitten be kept when alone? |  |  |
| 147 | `q147_areYou` | radio | Are you planning on declawing your new cat or kitten? | Yes | Options: Yes / No / Maybe |
| 148 | `q148_areYour148` | radio | Are your current cats declawed? | Yes | Options: Yes / No / N/A |
| 51 | `q51_areAny` | radio | Are any members of your household allergic to animals? | Yes | Options: Yes / No |
| 52 | `q52_ifYes52` | textarea | If yes, please describe: |  |  |
| 126 | `q126_whoWill` | textarea | Who will have chief responsibility for the care of your new pet? | Yes |  |
| 54 | `q54_overThe` | dropdown | Over the past 5 years, how many pets have you owned? (Include current pets) | Yes | Options: 0 / 1 / 2 / 3 / 4 / 5 / 6+ |
| 55 | `q55_listEach` | textarea | List each individually including breed, age, still living with you? (if not, why?) |  |  |
| 56 | `q56_haveYou56` | radio | Have you and your spouse (if applicable) ever owned a cat together? | Yes | Options: Yes / No / N/A |
| 115 | `q115_ifYes115` | textarea | If yes, when? |  |  |
| 151 | `q151_haveYou` | radio | Have you ever lost or given away a pet? | Yes | Options: Yes / No |
| 58 | `q58_ifYou58` | textarea | If you currently own a dog or cat, how does he/she react to new cats? |  |  |
| 59 | `q59_areYour` | radio | Are your present pets up-to-date on their annual vaccines? | Yes | Options: Yes / No / N/A |
| 60 | `q60_ifNo60` | textarea | If no, please explain: |  |  |
| 61 | `q61_areYour61` | radio | Are your present pets spayed or neutered? | Yes | Options: Yes / No / N/A |
| 62 | `q62_ifNo62` | textarea | If no, please explain. |  |  |
| 63 | `q63_wereYour` | radio | Were your previous pets spayed or neutered? | Yes | Options: Yes / No / N/A |
| 64 | `q64_ifNo64` | textarea | If no, please explain. |  |  |
| 127 | `q127_howMuch` | textarea | How much are you financially prepared to spend for routine/emergency medical care, licensing, etc? | Yes |  |
| 66 | `q66_whatPlans` | textarea | What plans do you have for your new pet when you are on vacation? | Yes |  |
| 145 | `q145_whichCats` | textarea | Which cat(s) are you interested in? | Yes |  |
| 69 | `q69_ageOf` | checkbox | Age of cat you would consider adopting: (check all that apply) | Yes | Options: Kitten / Young / Adult / Special Needs / Senior |
| 159 | `q159_pleaseSelect159` | checkbox | Please select your preferences: |  | Options: Short haired breed / Long haired/exotic breed / Male / Female / Any of the above |
| 75 | `q75_canwillYou` | radio | Can/Will you provide your cat with monthly flea/tick prevention? | Yes | Options: Yes / No |
| 164 | `q164_howMuch164` | textbox | How much are you prepared to spend on relocating your cat(s) with you when you leave? |  |  |
| 128 | `q128_whoIs128` | textarea | Who is your current or most recent veterinarian? Please provide their NAME and PHONE NUMBER: PLEASE MAKE SURE... | Yes |  |
| 149 | `q149_ifYour149` | checkbox | If your cat displays behavioral problems (such as poor litter box habits, inappropriate scratching etc.) how ... | Yes | Options: Contact a Professional / Use a book / Personal Knowledge / Other |
| 154 | `q154_ifOther154` | textarea | If other, please explain: |  |  |
| 150 | `q150_whatType` | checkbox | What type of solution would you be willing to try if housebreaking accidents continue after the first week (c... | Yes | Options: Move box to new location / Try a different litter / Clean box more often / Have cat examined by vet / Use a cat door / Return Cat / None / Other |
| 155 | `q155_ifOther155` | textarea | If other, please explain: |  |  |
| 129 | `q129_whatBrand` | textarea | What brand of cat food do you plan on feeding your new cat? | Yes |  |
| 91 | `q91_isYour` | radio | Is your entire immediate family in agreement with the decision to bring a new pet into your home? | Yes | Options: Yes / No |
| 131 | `q131_ifAnyone131` | textarea | If anyone is NOT, please explain: |  |  |
| 93 | `q93_areYou93` | radio | Are you prepared to commit to a pet for 15 - 20 years (average life span)? | Yes | Options: Yes / No |
| 94 | `q94_areYou94` | radio | Are you willing to allow one of our local representatives to make future visits to your home? | Yes | Options: Yes / No |
| 95 | `q95_haveYou95` | radio | Have you or any member of your household ever been charged with cruelty to animals or negligence in animal ca... | Yes | Options: Yes / No |
| 132 | `q132_ifYes132` | textarea | If yes, please describe: |  |  |
| 97 | `q97_haveYou97` | radio | Have you ever adopted or tried to adopt a pet before? If yes, fill out info below. | Yes | Options: Yes / No |
| 133 | `q133_rescueInformation133` | fullname | Rescue Information |  | Parts: first, last |
| 134 | `q134_rescuesPhone` | phone | Rescue's Phone Number |  |  |
| 135 | `q135_whyAre` | textarea | Why are you choosing to adopt vs. buying from a pet store or breeder? | Yes |  |
| 136 | `q136_ifOther` | textarea | If other, please explain: |  |  |
| 100 | `q100_whereWill100` | dropdown | Where will your cat spend most of his/her time? | Yes | Options: Indoors Only / Outdoors Only / Indoors and Outdoors / Barn Cat / Basement/Garage / Confined |
| 156 | `q156_ifYou` | radio | If you selected outdoor, would your cat be supervised? |  | Options: Yes / No |
| 138 | `q138_whereWill138` | textarea | Where will your cat eat? | Yes |  |
| 139 | `q139_whereWill139` | textarea | Where will your cat sleep? | Yes |  |
| 107 | `q107_reference1107` | textbox | Reference #1 | Yes |  |
| 140 | `q140_reference` | phone | Reference # 1 Phone Number | Yes |  |
| 108 | `q108_reference2108` | textbox | Reference #2 | Yes |  |
| 141 | `q141_reference2` | phone | Reference #2 Phone Number | Yes |  |
| 109 | `q109_reference3109` | textbox | Reference #3 | Yes |  |
| 142 | `q142_reference142` | phone | Reference # 3 Phone Number | Yes |  |
| 143 | `q143_ifThere` | textarea | If there is anything else you think we should know, please note it here. |  |  |

</details>


### Greens Cat's Deworming Record (disabled)

| | |
|---|---|
| Form ID | `210963735401452` |
| URL | https://form.jotform.com/210963735401452 |
| Submissions | 10 (last: 2021-05-26 00:30:10) |
| Created / updated | 2021-04-07 / 2021-04-07 |
| Structure | 7 input fields over 1 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | file uploads |

<details><summary>Fields (7)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 3 | `q3_yourName` | fullname | Your Name | Yes | Parts: first, last |
| 55 | `q55_yourEmail` | email | Your email address |  |  |
| 53 | `q53_dateOf` | datetime | Date of deworming | Yes | Format ddmmyyyy (lite) |
| 39 | `q39_uploadAt` | fileupload | Upload at least one photo of dewormed cat | Yes | Files (multiple), max 10854 KB |
| 15 | `q15_nameOf15` | textbox | Name of the Cat (if applicable) |  |  |
| 54 | `q54_shortDescription` | textbox | Short description of where the cat usually lives | Yes |  |
| 56 | `q56_whichDeworming` | radio | Which deworming medication have you administered? |  | Options: Drontal Cat Wormer / Panacur Small Animal 10% Suspension; allows "Other" |

</details>

<details><summary>Conditional logic (2)</summary>

- *field*: if field 26 equals "Yes" then show field 28
- *field*: if field 19 equals "Yes" then showmultiple field 20, field 21, field 23, field 22

</details>

### Event RSVP Form (disabled)

| | |
|---|---|
| Form ID | `213181312240439` |
| URL | https://form.jotform.com/213181312240439 |
| Submissions | 4 (last: 2021-12-03 10:43:58) |
| Created / updated | 2021-11-15 / 2023-10-18 |
| Structure | 8 input fields over 3 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | - |

<details><summary>Fields (8)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 93 | `q93_willYou93` | dropdown | Will you be attending? |  | Options: Yes / No |
| 28 | `q28_fullName28` | fullname | Full Name | Yes | Parts: first, last |
| 90 | `q90_phoneNumber90` | phone | Phone Number |  |  |
| 29 | `q29_email29` | email | E-mail |  |  |
| 87 | `q87_numbersOf` | number | Numbers of People Attending |  |  |
| 91 | `q91_willYou` | radio | Will you require parking? |  | Options: Yes / No |
| 83 | `q83_addressFor` | address | Address for delivery of tickets | Yes | Subfields: |
| 15 | `q15_comments` | textarea | Comments |  |  |

</details>

<details><summary>Conditional logic (1)</summary>

- *page*: if "Will you be attending?" equals "No" then hidePage page-2: Last Page

</details>

### Cat Profile Builder (disabled)

| | |
|---|---|
| Form ID | `211032873247451` |
| URL | https://form.jotform.com/211032873247451 |
| Submissions | 3 (last: 2021-08-04 07:26:33) |
| Created / updated | 2021-04-14 / 2021-08-03 |
| Structure | 49 input fields over 5 page(s) |
| Emails | 1 notification, 0 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | file uploads |

<details><summary>Fields (49)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 52 | `q52_yourName` | textbox | Your name: | Yes |  |
| 53 | `q53_yourHome` | textbox | Your home address: | Yes |  |
| 55 | `q55_phoneNumber` | textbox | Phone number: | Yes |  |
| 54 | `q54_yourEmail` | textbox | Your email address: |  |  |
| 4 | `q4_catsName4` | textbox | Cat's name 1: | Yes |  |
| 74 | `q74_catsName` | textbox | Cat's name 2: | Yes |  |
| 75 | `q75_catsName75` | textbox | Cat's name 3: | Yes |  |
| 68 | `q68_whatGender` | matrix | What gender and age is your cat? |  | Matrix (Dynamic) rows: Cat 1 / Cat 2 / Cat 3; cols: Female / Male / Age |
| 6 | `q6_howLong6` | textbox | How long have you had your cat or how long has it been in a foster home? |  |  |
| 7 | `q7_whatIs7` | textarea | What is your reason for surrender? (Go to next question if it's a rescue cat) |  |  |
| 9 | `q9_whereDid` | dropdown | Where did you get your cat? |  | Options: Found Stray / Friend/relative / Gift / Own Litter / Breeder (Papers required) / Pet Store / Other |
| 10 | `q10_describeThe` | dropdown | Describe the current household the cat is in |  | Options: Quiet / Active / Noisy |
| 12 | `q12_areThere` | radio | Are there other animals in the home? | Yes | Options: Yes / No |
| 13 | `q13_whatTypes` | checkbox | What types of animals has your cat been around? |  | Options: Cats / Dogs; allows "Other" |
| 50 | `q50_howMany50` | spinner | How many other cats has your cat been around? |  |  |
| 51 | `q51_howMany51` | spinner | How many dogs has your cat been around? |  |  |
| 11 | `q11_howDoes11` | matrix | How does your cat act or behave around the following. Check all that apply. |  | Matrix (Radio Button) rows: Children / Strangers / Other Cats / Dogs / Indoors / Outdoors / Loud Noises; cols: Friendly / Cautious / Fearful / Submissive / Tolerates / Aggressive / Essential / Absolutely No / I don't know |
| 18 | `q18_whatVeterinarian` | textbox | What veterinarian office does your cat go to? |  |  |
| 67 | `q67_typeA` | matrix | Type a question |  | Matrix (Radio Button) rows: Cat 1 / Cat 2 / Cat 3; cols: FIV+ / FIV Negative / FeLV+ / FELV Negative / Rabies Vaccinated / PCH Booster / Dewormed / Microchipped |
| 20 | `q20_whatMedical20` | textarea | What medical conditions does your cat have if applicable? |  |  |
| 21 | `q21_isYour` | radio | Is your cat currently on any medications or special diets? |  | Options: Yes / No |
| 22 | `q22_pleaseList` | textarea | Please list medications or special diet. |  |  |
| 24 | `q24_isYour24` | radio | Is your cat spayed or neutered? (Did your cat have an operation so it can't have babies?) |  | Options: Yes / No / I don't know |
| 25 | `q25_isYour25` | radio | Is your cat declawed? |  | Options: Yes, front and back declawed / Yes, just front declawed / No |
| 26 | `q26_whatType26` | checkbox | What type of food does your cat eat? (Check all that apply) |  | Options: Dry / Wet / Both |
| 71 | `q71_pleaseInclude71` | textarea | Please include some detail on feeding routine, food brands, favourite food and treats |  |  |
| 29 | `q29_doesYour29` | radio | Does your cat always use the litterbox? |  | Options: Yes / No; allows "Other" |
| 31 | `q31_whatType` | radio | What type of litter does your cat use? |  | Options: Clay - clumping / Clay - non clumping / Crystal; allows "Other" |
| 32 | `q32_howMany` | radio | How many litterboxes are available? |  | Options: 1 / 2 / 3 / More than 3 |
| 34 | `q34_isThe` | radio | Is the litterbox... |  | Options: Open / Covered / Self-cleaning / Top entry; allows "Other" |
| 35 | `q35_whereIs` | textbox | Where is the litterbox located in your home? |  |  |
| 38 | `q38_checkAll` | checkbox | Check all that describe your cat's personality: |  | Options: Playful / Couch potato / Talkative / Affectionate / Destructive / Shy / Aggressive / Independent |
| 39 | `q39_hasYour` | radio | Has your cat ever bitten? |  | Options: Yes / No |
| 40 | `q40_pleaseDescribe` | textarea | Please describe the time your cat has bitten in as much detail as possible. |  |  |
| 41 | `q41_didThe` | radio | Did the bite break skin? |  | Options: Yes / No |
| 42 | `q42_whereDoes` | radio | Where does your cat live? |  | Options: Indoor only / Outdoor only / Indoor/Outdoor; allows "Other" |
| 43 | `q43_doesYour43` | radio | Does your cat like to be held? |  | Options: Yes / No |
| 44 | `q44_doesYou` | radio | Does you cat like to be picked up? |  | Options: Yes / No |
| 45 | `q45_isYour45` | radio | Is your cat a lap cat? |  | Options: Yes, often / Yes, sometimes / Rarely / Never |
| 46 | `q46_howDoes` | radio | How does your cat play? |  | Options: Gentle / Somewhat rough / Very rough / Does not play |
| 47 | `q47_whatIs47` | textbox | What is your cat's best quality? |  |  |
| 48 | `q48_whatIs48` | textbox | What is your cat's worst quality? Please be honest and transparent - this will help us ensure the new owner i... |  |  |
| 49 | `q49_pleaseList49` | textarea | Please list any other information it's important for us to know about your cat! |  |  |
| 58 | `q58_pleaseWrite` | textarea | Please write a detailed profile for your cat here including details about your cat's interactions with animal... |  |  |
| 60 | `q60_input60` | fileupload |  | Yes | Files (multiple), max 10854 KB |
| 72 | `q72_theIdeal` | textarea | The ideal family will.... |  |  |
| 61 | `q61_pleaseUpload` | fileupload | Please upload pictures and videos here | Yes | Files (multiple), max 0 KB |
| 62 | `q62_pleaseUpload62` | fileupload | Please upload the pet passport here & any other original papers |  | Files (multiple), max 10854 KB |
| 63 | `q63_pleaseUpload63` | fileupload | Please upload the vets report here. Essential details: General health commentary including mouth, Biochemistr... |  | Files (multiple), max 10854 KB |

</details>

<details><summary>Conditional logic (8)</summary>

- *field*: if "What types of animals has your cat been..." equals "Dogs" then show "How many dogs has your cat been around?"
- *field*: if "What types of animals has your cat been..." equals "Cats" then show "How many other cats has your cat been a..."
- *field*: if "Has your cat ever bitten?" equals "Yes" then showmultiple "Please describe the time your cat has b...", "Did the bite break skin?"
- *field*: if "Does your cat always use the litterbox?" equals "No" then show field 30
- *field*: if "Is your cat currently on any medication..." equals "Yes" then show "Please list medications or special diet."
- *field*: if field 19 equals "Yes" then show "What medical conditions does your cat h..."
- *field*: if field 17 equals "Yes" then show "What veterinarian office does your cat ..."
- *field*: if "Are there other animals in the home?" equals "Yes" then show "What types of animals has your cat been..."

</details>

### F1 Qualifying RSVP Form (disabled)

| | |
|---|---|
| Form ID | `213213315919451` |
| URL | https://form.jotform.com/213213315919451 |
| Submissions | 3 (last: 2023-10-18 05:14:21) |
| Created / updated | 2021-11-18 / 2023-10-18 |
| Structure | 8 input fields over 3 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | - |

<details><summary>Fields (8)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 93 | `q93_willYou93` | dropdown | Will you be attending? |  | Options: Yes / No |
| 28 | `q28_fullName28` | fullname | Full Name | Yes | Parts: first, last |
| 90 | `q90_phoneNumber90` | phone | Phone Number |  |  |
| 29 | `q29_email29` | email | E-mail |  |  |
| 87 | `q87_numbersOf` | number | Numbers of People Attending |  |  |
| 91 | `q91_willYou` | radio | Will you require parking? |  | Options: Yes / No |
| 83 | `q83_addressFor` | address | Address for delivery of tickets | Yes | Subfields: |
| 15 | `q15_comments` | textarea | Comments |  |  |

</details>

<details><summary>Conditional logic (1)</summary>

- *page*: if "Will you be attending?" equals "No" then hidePage page-2: Last Page

</details>

### ADSI JD FORM (disabled)

| | |
|---|---|
| Form ID | `203071110827039` |
| URL | https://form.jotform.com/203071110827039 |
| Submissions | 1 (last: 2020-11-10 07:16:29) |
| Created / updated | 2020-11-03 / 2021-11-19 |
| Structure | 7 input fields over 1 page(s) |
| Emails | 1 notification, 0 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | - |

<details><summary>Fields (7)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 21 | `q21_name` | fullname | Name |  | Parts: first, last |
| 6 | `q6_location` | textbox | Location |  |  |
| 7 | `q7_jobTitle` | textbox | Job Title |  |  |
| 8 | `q8_reportingTo` | textbox | Reporting to |  |  |
| 15 | `q15_description` | textarea | Description |  |  |
| 16 | `q16_workExperience` | textarea | Work Experience Requirements |  |  |
| 17 | `q17_educationRequirements` | textarea | Education Requirements |  |  |

</details>


### FindUrPet (disabled)

| | |
|---|---|
| Form ID | `210963098318461` |
| URL | https://form.jotform.com/ibktails/FindUrPet |
| Submissions | 1 (last: 2021-04-07 07:28:53) |
| Created / updated | 2021-04-07 / 2021-11-19 |
| Structure | 20 input fields over 2 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | file uploads, widgets |

<details><summary>Fields (20)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 41 | `q41_selectOne` | dropdown | Select One | Yes | Options: Register My Pet / Register A Lost Pet |
| 3 | `q3_name` | fullname | Name | Yes | Parts: first, last |
| 5 | `q5_address` | address | Address | Yes | Subfields: state, st1, city, st2 |
| 6 | `q6_phoneNumber6` | phone | Phone Number (Mobile) | Yes |  |
| 7 | `q7_phoneNumber7` | phone | Phone Number (Work) | Yes |  |
| 10 | `q10_email10` | email | E-mail | Yes |  |
| 35 | `q35_name35` | fullname | Name |  | Parts: first, last |
| 37 | `q37_relationshipTo` | textbox | Relationship to Owner |  |  |
| 8 | `q8_backUp8` | phone | Back Up Person Contact Number |  |  |
| 38 | `q38_backUp` | email | Back Up Person Email |  |  |
| 34 | `q34_species` | radio | Species | Yes | Options: Cat / Dog / Rabbit / Bird |
| 15 | `q15_nameOf15` | textbox | Name of the Pet | Yes |  |
| 17 | `q17_petsAge` | number | Pet's Age | Yes |  |
| 53 | `q53_petMicrochip53` | textbox | Pet Microchip Number | Yes |  |
| 54 | `q54_dubaiMunicipality54` | textbox | Dubai Municipality Tag (if applicable) |  |  |
| 32 | `q32_isYour` | radio | Is your pet male or female? | Yes | Options: Male / Female |
| 21 | `q21_clinicName21` | textbox | Clinic Name | Yes |  |
| 39 | `q39_yourPets` | fileupload | Your Pet's Photo | Yes | Files (multiple), max 10854 KB |
| 51 | `q51_helpUs` | radio | Help us continue to reunite lost pets with their owners. We will send out lost Pet Alert emails, and every ti... |  | Options: Opt In / Opt Out |
| 49 | `q49_typeA` | widget | Terms and Conditions | Yes | Widget: Terms & Conditions |

</details>

<details><summary>Conditional logic (2)</summary>

- *field*: if field 26 equals "Yes" then show field 28
- *field*: if field 19 equals "Yes" then showmultiple field 20, "Clinic Name", field 23, field 22

</details>

### Clone of Pre-Adoption Form (disabled)

| | |
|---|---|
| Form ID | `240265652203448` |
| URL | https://form.jotform.com/240265652203448 |
| Submissions | 1 (last: 2024-01-27 15:39:03) |
| Created / updated | 2024-01-27 / 2024-01-27 |
| Structure | 36 input fields over 5 page(s) |
| Emails | 1 notification, 2 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | file uploads |

<details><summary>Fields (36)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 165 | `q165_howDid` | dropdown | How did you hear about us? | Yes | Options: Website Enquiry / Facebook / Instagram / Google / Friend/Relative |
| 189 | `q189_whatIs` | textbox | What is your friend/relative's name? |  |  |
| 145 | `q145_whichCatsdogs145` | textarea | Which cat(s)/dog(s) are you interested in? | Yes |  |
| 119 | `q119_yourFull` | fullname | Your Full Name | Yes | Parts: first, last |
| 120 | `q120_yourHome` | address | Your Home Address | Yes | Subfields: st1, st2, city, state, zip, country |
| 25 | `q25_howLong25` | textbox | How long have you lived at this address?: | Yes |  |
| 121 | `q121_phoneNumber` | phone | Phone Number |  |  |
| 124 | `q124_email124` | email | E-mail | Yes |  |
| 167 | `q167_selectOne` | dropdown | Select one of the following: | Yes | Options: Rented / Owned / Living with parents / Shared Accommodation (HMO) |
| 180 | `q180_pleaseDescribe` | dropdown | Please describe your accommodation? | Yes | Options: House / Apartment / Studio Apartment |
| 182 | `q182_doesYou` | radio | Does you home have access to a private garden |  | Options: Yes / No |
| 152 | `q152_whatIs152` | checkbox | What is your household activity level? | Yes | Options: Quiet as a library / Grand Central Station / Somewhere in between / Other |
| 171 | `q171_ifOther` | textarea | If other, please explain: |  |  |
| 174 | `q174_listAll174` | textarea | List all people and their age (including yourself) of who will be living with the new pet | Yes |  |
| 91 | `q91_isYour` | radio | Is your entire immediate family in agreement with the decision to bring a new pet into your home? | Yes | Options: Yes / No |
| 131 | `q131_ifAnyone131` | textarea | If anyone is NOT, please explain: |  |  |
| 172 | `q172_whatIs172` | checkbox | What is your experience as a pet owner? | Yes | Options: First-time owner / Have had 1 or 2 / Knowledgeable and experienced / Other |
| 173 | `q173_ifOther173` | textarea | If other, please explain: |  |  |
| 170 | `q170_whatIs170` | checkbox | What is your reason for wanting to adopt a cat/dog? | Yes | Options: Housepet / Mouse Patrol / Companion / Companion for pet / For the Kids / Gift / Other |
| 153 | `q153_ifOther153` | textarea | If other, please explain: |  |  |
| 186 | `q186_pleaseList` | textarea | Please list all the pets currently living with you, their age, breed and how they would react to having anoth... |  |  |
| 187 | `q187_areYour` | dropdown | Are your current pets sterilised? |  | Options: Yes / No / NA |
| 135 | `q135_whyAre` | textarea | Why are you choosing to adopt vs. buying from a pet store or breeder? | Yes |  |
| 168 | `q168_howMany` | number | How many total hours will your new pet be left alone during the day? |  |  |
| 51 | `q51_areAny` | radio | Are any members of your household allergic to animals? | Yes | Options: Yes / No |
| 52 | `q52_ifYes52` | textarea | If yes, please describe: |  |  |
| 175 | `q175_whoWill` | radio | Who will have chief responsibility for the care of your new pet? |  | Options: Myself / My Partner / My Parents / My Family / Other |
| 176 | `q176_ifOther176` | textarea | If other, please explain: |  |  |
| 151 | `q151_hasA` | radio | Has a pet ever gone missing or been killed in a road traffic accident? | Yes | Options: Yes / No / NA |
| 69 | `q69_ageOf` | checkbox | Age of cat /dog you would consider adopting: (check all that apply) | Yes | Options: Kitten/puppy / Young / Adult / Special Needs / Senior / Bonded pair |
| 159 | `q159_pleaseSelect` | checkbox | Please select your preferences (skip this if you are looking to adopt a dog) |  | Options: Short haired breed / Long haired/exotic breed / Male / Female / Any of the above |
| 93 | `q93_areYou93` | radio | Are you prepared to commit to a pet for 15 - 20 years (average life span)? | Yes | Options: Yes / No |
| 178 | `q178_willYour` | radio | Will your pet be allowed outside? | Yes | Options: Indoors only / Indoor-outdoor / Indoors, with some supervised time outside / Indoors, with a catio so the can still experience some outdoors safely |
| 177 | `q177_tellUs` | textarea | Tell us a little bit more about your typical day and others living with you. Additional information about cur... |  |  |
| 200 | `q200_optionalFeel` | fileupload | OPTIONAL: Feel free to upload some pictures here to support you application. |  | Files (multiple), max 10854 KB |
| 192 | `q192_theInformation` | checkbox | The information you have provided on this form will be used by Petooti for the purposes of facilitating your ... |  | Options: Email / Phone / Text |

</details>

<details><summary>Conditional logic (5)</summary>

- *email*: if "Your Home Address" notEqualCountry "United Arab Emirates" then send autorespond "Autoresponder 1"
- *email*: if "Your Home Address" equalCountry "United Arab Emirates" then send autorespond "Petooti Autoresponder"
- *field*: if "Your Home Address" equalCountry "United Arab Emirates" then hide "The information you have provided on th..."
- *field*: if "How did you hear about us?" notEquals "Friend/Relative" then hide "What is your friend/relative's name?"
- *field*: if "How did you hear about us?" equals "Friend/Relative" then show "What is your friend/relative's name?"

</details>

### UAE Foster Form_Do not use (disabled)

| | |
|---|---|
| Form ID | `202295547501453` |
| URL | https://form.jotform.com/202295547501453 |
| Submissions | 0 (last: never) |
| Created / updated | 2020-08-17 / 2020-08-17 |
| Structure | 32 input fields over 1 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | signatures, widgets |

<details><summary>Fields (32)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 20 | `q20_fullName20` | fullname | Full Name | Yes | Parts: first, last |
| 10 | `q10_age` | number | Age |  |  |
| 6 | `q6_email6` | email | E-mail | Yes |  |
| 7 | `q7_address7` | address | Address | Yes | Subfields: st1, st2, city |
| 12 | `q12_phoneNumber12` | phone | Phone Number - Cellular |  |  |
| 79 | `q79_whyDo` | textbox | Why do you want to foster a cat? |  |  |
| 80 | `q80_howLong` | textbox | How long can you foster for? |  |  |
| 14 | `q14_doYou` | dropdown | Do you live in a: |  | Options: Apartment / Townhouse / Villa / Shared Accommodation / Other |
| 15 | `q15_doYou15` | radio | Do you: |  | Options: Own / Rent / Live with parents / Other |
| 18 | `q18_describeYour` | radio | Describe your Homes Activity Level |  | Options: Busy/Noisy / Moderate Comings/Goings / Quiet with Occasional Guests |
| 81 | `q81_doYou81` | radio | Do you have a balcony | Yes | Options: Yes / No |
| 83 | `q83_ifYes` | radio | If yes, will the balcony be secured? | Yes | Options: Yes / No |
| 82 | `q82_ifNot` | textbox | If not, do you agree to NOT let the cat(s) out on to the balcony and you agree to take extra care when openin... |  |  |
| 19 | `q19_pleaseList19` | textarea | Please list all people living in the household (Include Name, Relationship, Gender and Age) | Yes |  |
| 84 | `q84_ifYou` | radio | If you have children do you understand that if you let your children play with the cat, they need to be super... |  | Options: Yes / No |
| 85 | `q85_ifYou85` | radio | If you have children do you understand that the cat will need a space away from the children? |  | Options: Yes / No |
| 21 | `q21_doesAnyone` | radio | Does anyone in your household have allergies to animals? |  | Options: Yes / No |
| 22 | `q22_areAll` | radio | Are all members of your Family agreeable to Fostering a Cat? |  | Options: Yes / No |
| 23 | `q23_pleaseList` | textarea | Please list any pets you have living or deceased (Please include type, name, breed, vaccinations, any health ... | Yes |  |
| 24 | `q24_doYou24` | radio | Do you have a preference of gender to foster? |  | Options: Male / Female / No Preference |
| 25 | `q25_areYou25` | radio | Are you willing to foster a cat of any age? |  | Options: Yes / No |
| 27 | `q27_ifNot27` | textbox | If not, what age would you consider? |  |  |
| 28 | `q28_pleaseDescribe` | textarea | Please describe the type of cat you are willing to foster (please include breed, coat length, personality tra... |  |  |
| 29 | `q29_weWill` | radio | We will manage the financial burden of the cat you foster. Are you willing to take your foster cat to vet app... |  | Options: Yes / No |
| 77 | `q77_doYou77` | radio | Do you drive or have access to a vehicle to bring your foster cat to events and appointments? |  | Options: Yes / No |
| 31 | `q31_areYou31` | radio | Are you willing and able to medicate your foster cat, if applicable? |  | Options: Yes / No |
| 32 | `q32_someOf` | radio | Some of our rescues are abused, therefore require some training. Are you experienced to train with love and p... |  | Options: Yes / No |
| 42 | `q42_howMany` | number | How many hours in a day would the foster be left alone? |  |  |
| 73 | `q73_date73` | datetime | Date |  | Format mmddyyyy |
| 47 | `q47_yourName47` | textbox | Your name | Yes |  |
| 78 | `q78_signature` | signature | Signature |  |  |
| 86 | `q86_followUs` | widget | Follow us for the latest updates |  | Widget: Social Follow |

</details>


### References (disabled)

| | |
|---|---|
| Form ID | `220642640464451` |
| URL | https://form.jotform.com/220642640464451 |
| Submissions | 0 (last: never) |
| Created / updated | 2022-03-06 / 2022-03-06 |
| Structure | 5 input fields over 1 page(s) |
| Emails | 1 notification, 0 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | - |

<details><summary>Fields (5)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 1 | `q1_yourName` | fullname | Your Name | Yes | Parts: first, last |
| 2 | `q2_date` | datetime | Date |  | Format undefined |
| 3 | `q3_referenceName` | textarea | Reference Name Phone number and relationship | Yes |  |
| 4 | `q4_referenceName4` | textarea | Reference Name Phone number and relationship | Yes |  |
| 5 | `q5_referenceName5` | textarea | Reference Name Phone number and relationship | Yes |  |

</details>


### Clone of Adoption Form and References (disabled)

| | |
|---|---|
| Form ID | `260843470967467` |
| URL | https://form.jotform.com/260843470967467 |
| Submissions | 0 (last: never) |
| Created / updated | 2026-03-26 / 2026-03-26 |
| Structure | 42 input fields over 1 page(s) |
| Emails | 1 notification, 1 autoresponder |
| Integrations | none; webhooks: none |
| After submit | thank-you message |
| Notable | file uploads, widgets |

<details><summary>Fields (42)</summary>

| QID | Webhook key | Type | Label | Req. | Details |
|---|---|---|---|---|---|
| 166 | `q166_whichCat` | textbox | Which cat are your applying for? |  |  |
| 119 | `q119_yourFull` | fullname | Your Full Name | Yes | Parts: first, last |
| 120 | `q120_yourHome` | address | Your Home Address | Yes | Subfields: st1, st2, city, state, zip, country |
| 124 | `q124_email124` | email | E-mail | Yes |  |
| 169 | `q169_pleaseUpload` | fileupload | Please upload ID |  | Files (multiple), max 10854 KB |
| 170 | `q170_pleaseUpload170` | fileupload | Please upload ID |  | Files (multiple), max 10854 KB |
| 36 | `q36_areYou36` | radio | Do you agree to providing food and litter for the cat in your care? | Yes | Options: Yes / No |
| 147 | `q147_areYou` | radio | Do you agree to providing routine flea and worming treatment to the cat in your care? | Yes | Options: Yes / No / Maybe |
| 148 | `q148_areYour148` | radio | Do you agree that the cat in | Yes | Options: Yes / No / N/A |
| 126 | `q126_whoWill` | textarea | Who will have chief responsibility for the care of your new pet? | Yes |  |
| 59 | `q59_areYour` | radio | Are your present pets up-to-date on their annual vaccines? | Yes | Options: Yes / No / N/A |
| 60 | `q60_ifNo60` | textarea | If no, please explain: |  |  |
| 127 | `q127_howMuch` | textarea | How much are you financially prepared to spend for routine/emergency medical care, licensing, etc? | Yes |  |
| 66 | `q66_whatPlans` | textarea | What plans do you have for your new pet when you are on vacation? | Yes |  |
| 75 | `q75_canwillYou` | radio | Can/Will you provide your cat with monthly flea/tick prevention? | Yes | Options: Yes / No |
| 128 | `q128_whoIs128` | textarea | Who is your current or most recent veterinarian? Please provide their NAME and PHONE NUMBER: PLEASE MAKE SURE... | Yes |  |
| 149 | `q149_ifYour149` | checkbox | If your cat displays behavioral problems (such as poor litter box habits, inappropriate scratching etc.) how ... | Yes | Options: Contact a Professional / Use a book / Personal Knowledge / Other |
| 154 | `q154_ifOther154` | textarea | If other, please explain: |  |  |
| 150 | `q150_whatType` | checkbox | What type of solution would you be willing to try if housebreaking accidents continue after the first week (c... | Yes | Options: Move box to new location / Try a different litter / Clean box more often / Have cat examined by vet / Use a cat door / Return Cat / None / Other |
| 155 | `q155_ifOther155` | textarea | If other, please explain: |  |  |
| 129 | `q129_whatBrand` | textarea | What brand of cat food do you plan on feeding your new cat? | Yes |  |
| 94 | `q94_areYou94` | radio | Are you willing to allow one of our local representatives to make future visits to your home? | Yes | Options: Yes / No |
| 95 | `q95_haveYou95` | radio | Have you or any member of your household ever been charged with cruelty to animals or negligence in animal ca... | Yes | Options: Yes / No |
| 132 | `q132_ifYes132` | textarea | If yes, please describe: |  |  |
| 97 | `q97_haveYou97` | radio | Have you ever adopted or tried to adopt a pet before? If yes, fill out info below. | Yes | Options: Yes / No |
| 133 | `q133_rescueInformation133` | fullname | Rescue Information |  | Parts: first, last |
| 134 | `q134_rescuesPhone` | phone | Rescue's Phone Number |  |  |
| 100 | `q100_whereWill100` | dropdown | Where will your cat spend most of his/her time? | Yes | Options: Indoors Only / Outdoors Only / Indoors and Outdoors / Barn Cat / Basement/Garage / Confined |
| 156 | `q156_ifYou` | radio | If you selected outdoor, would your cat be supervised? |  | Options: Yes / No |
| 138 | `q138_whereWill138` | textarea | Where will your cat eat? |  |  |
| 139 | `q139_whereWill139` | textarea | Where will your cat sleep? | Yes |  |
| 107 | `q107_reference1107` | textbox | Reference #1 |  |  |
| 140 | `q140_reference` | phone | Reference # 1 Phone Number |  |  |
| 171 | `q171_reference1` | email | Reference #1 Email Address | Yes |  |
| 108 | `q108_reference2108` | textbox | Reference #2 |  |  |
| 141 | `q141_reference2` | phone | Reference #2 Phone Number |  |  |
| 172 | `q172_reference2172` | email | Reference #2 Email |  |  |
| 109 | `q109_reference3109` | textbox | Reference #3 |  |  |
| 142 | `q142_reference142` | phone | Reference # 3 Phone Number |  |  |
| 173 | `q173_reference3` | email | Reference #3 Email |  |  |
| 143 | `q143_ifThere` | textarea | If there is anything else you think we should know, please note it here. |  |  |
| 160 | `q160_seeOur` | widget | See our latest updates |  | Widget: Social Follow |

</details>

<details><summary>Conditional logic (2)</summary>

- *email*: if field 165 notEquals "Joy Afif" then send notification "Notification 1"
- *email*: if field 165 equals "Joy Afif" then send notification "Notification 1"; send notification "Notification 1"

</details>
