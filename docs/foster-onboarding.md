# Foster Onboarding and Foster Portal

Status: design agreed 2026-11-17. **All five phases are built and tested on the server.** Nothing is deployed, and none of the pages has been tried in a browser. The phases at the bottom are built one at a time, each tested and documented before the next starts.

Source: Client Review item "Cats: No in-app entry point for fosters (Kitty Profile inputs)". The client brief wants the foster to supply personality, behaviour, food, photos and videos for the cat profile. Only rescuers have a portal today. The Foster role is refused on the staff app (role lockdown, 2026-11-11) and has nothing of its own.

## Goal

A foster applies through a public form, an Admin approves or rejects, the foster is emailed either way, and an approved foster gets a separate sign-in to a small portal. In the portal the foster sees the cats assigned to them and fills in a Kitty Profile for each. Staff review each profile and apply it to the cat.

It mirrors the rescuer onboarding and portal (`docs/rescuer-onboarding.md`) wherever it can.

## Decisions (2026-11-17)

| Topic | Decision |
|---|---|
| Access | Foster login and portal. Not a link without sign-in. |
| Accounts | A public application with approval, then an email with a set-password link valid 7 days. |
| Application form | A copy of the client's own IBKT Foster Compliance & Safeguarding Form (Jotform 260843004451044): contact details, the Yes/No foster rules, an emergency contact, three references, the declarations and a typed signature. Only Yes can submit. No wording is drafted by us. |
| Foster record | A new Fosters board on Monday, plus a login on the Users board with the role Foster, as for rescuers. |
| Cat to foster link | A Linked Foster relation column on the Cats board, kept in step with a link column on the Fosters board. |
| Profile answers | Saved as a submission that staff review and apply. A cat is never changed by an unreviewed submission. Apply shows each proposed cat value next to the current one, and staff tick, edit or leave out each of them. |
| Files | Photos, videos, passport and vet report wait on Monday in a new file column of the cat, Foster Uploads (pending), and move to the cat's own columns only when staff apply the submission. Decided 2026-11-17: on Monday, not in the app database. |
| Minimum files | A foster cannot send the profile with fewer than 6 photos and 3 videos, the same as the Adoption Ready check. The passport and the vet report are asked for but not required. |

## Flow

1. **Apply.** Public page `/become-a-foster` (the form copy, linked from the Forms page). The answers are saved in the app table `foster_applications` with the status Pending. The applicant gets an "we received it" email.
2. **Notify.** Every active Admin gets a bell notification.
3. **Review.** An Applications tab on the new Fosters page shows the answers, the references and the emergency contact. Approve or Reject with a reason.
4. **Reject.** Status Rejected with the reason and the reviewer, and a rejection email. The person may apply again.
5. **Approve.** One server operation, as for rescuers: a Fosters board record, a login on the Users board with the role Foster linked to it, a set-password link, the email, and the application marked Approved. A failure half way is finished by approving again.
6. **Sign in.** `/foster/login`, a separate page. A Foster account is refused on the staff sign-in, and a staff account is refused on the foster page.
7. **Assign cats.** Staff set the foster of a cat on the cat page (a Foster row that picks an active foster). This writes Linked Foster.
8. **Portal.** Two pages in a minimal layout: My Foster Cats, and a Kitty Profile form for each cat.
9. **Submit.** The Kitty Profile is saved in the app table `foster_cat_profiles` as Pending, with its files held in a pending store. Staff are notified.
10. **Review and apply.** A Foster submissions panel on the cat page shows the answers. Apply to profile fills the cat's fields and moves the files into the cat's Photos, Videos, Passport and Medical documents. Reject keeps the cat unchanged.

## What the Foster Role Becomes

Foster becomes a portal-only role like Rescuer. The server then refuses a foster on every staff route and on every route that does not opt in. This changes `src/constants/roles.js` and the login in `server/index.js`: today a Foster is refused at the staff sign-in with `NOT_STAFF`, and after this change a Foster may sign in on `/foster/login` only. This also settles the Foster half of Client Review item 10.

## Changes on the Live Monday Account

Done on 2026-11-17 in phase 1 by `server/scripts/createFostersBoard.js`. The ids are in `src/constants/boards/fosters.js`, and the new link columns are in `cats.js` and `users.js` (both named LINKED_FOSTER).

| Change | Detail |
|---|---|
| New board Fosters | Columns: Status, First Name, Last Name, Email, Phone, Country, City, Address, Emergency Contact, References, Foster Agreement Signed, Agreement Date, Notes, Link to Cats. |
| Cats board | New column Linked Foster (relation to the Fosters board). |
| Cats board (phase 4) | New file column Foster Uploads (pending), made by `server/scripts/createFosterUploadsColumn.js` on 2026-11-17. |
| Users board | New column Linked Foster (relation to the Fosters board), like Linked Rescuer. |

The Fosters board is then added to the database mirror (`MIRRORED_BOARDS`, `LINK_PAIRS`) and to `DATABASE_BOARDS` on every server. Foster features need the database and are not built for Monday mode.

## New App Tables

- `foster_applications` (created in phase 1): the answers of an application, the status, the reviewer, the decision, and how far an approval got. It has the same shape as `rescuer_applications`.
- `foster_cat_profiles` (created in phase 4): one row per submitted Kitty Profile, with the cat, the foster, the answers, the list of files sent, the status (Pending, Applied, Rejected) and the reviewer. A cat has at most one Pending profile.

There is no file store table: the held files are on Monday (see the decisions).

## Kitty Profile Form

Built from the Jotform "Kitty Profile For Rehoming" form (211112902350337), without its password and without the questions that need no one from outside. It collects: personality (the traits, best and worst quality, a free profile, the ideal family), behaviour with children, strangers, cats, dogs and noise, whether the cat is a lap cat and likes to be held, where it lives (indoor or outdoor), medical conditions and medication, spayed or neutered, food and feeding routine, litter habits, whether it has ever bitten, anything else, and the files (photos and videos, the passport and the vet report). Each answer maps to a cat field where one exists, and the rest are added to the cat's Special Notes when applied.

## Phase 1 Result (2026-11-17)

- The Fosters board (id 5108067329) has 15 columns: Foster ID, Status, First Name, Last Name, Email, Phone, Country, City, Address, Emergency Contact, References, Foster Agreement Signed, Agreement Date, Notes and link to Cats, plus the DB ID column the sync uses. Status has the labels New, Active, Inactive and Archive.
- Cats and Users each have a Linked Foster column. The one on Cats holds a single foster per cat, and Monday made the link to Cats column on the Fosters board as its reflection. The one on Users has no reflection.
- The Fosters board is in the database mirror (`MIRRORED_BOARDS`), and the Cats and Fosters link is a kept-in-step pair (`LINK_PAIRS`), so a change to a cat's foster updates the foster's cats in the database. The board is also known to the activity log and the board relations.
- **To switch it on, add `fosters` to `DATABASE_BOARDS` on every server** (the local `.env` and Render). It is not on yet. Foster features need the database and are not built for Monday mode.
- Tested: the table and its columns, a foster record created and read back, the link pair in both directions and after unlinking (a throwaway foster and cat, deleted afterwards from the database and Monday).
- At the same time, row-level security was enabled on 9 app tables that did not have it (see the note at the end).

## Phase 2 Result (2026-11-17)

Built and tested on the server. Not deployed, and none of the pages has been tried in a browser.

- **Application form.** The public page `/become-a-foster` is a copy of the client's Foster Compliance & Safeguarding Form, with its exact wording, order and required fields (`src/constants/forms/fosterApplicationForm.js`, wording version `2026-11-17-jotform-copy-1`). It is listed on the Forms page. Differences from Jotform: the full name is two questions, the address is several, the signature is a typed name, the declaration date is the day the form is sent, and only Yes can submit the commitment, responsibility and declaration statements. Two questions accept either answer and the reviewer sees the answer: whether any resident pets are vaccinated and neutered, and whether the person has had a dispute with a rescue. The question about a dispute asks for details when the answer is Yes.
- **Server.** `server/fosterOnboarding/` (`routes.js`, `approval.js`, `applicationsStore.js`) and `server/mail/fosterEmails.js` follow the rescuer onboarding. The public route has the same bot trap, the limit of 5 applications per address per hour and the same answer for every outcome. The set-password link, the IP hash and the country lookup are shared with the rescuer code.
- **Approval.** One server operation makes the Fosters record (with the address, the emergency contact, the references, the agreement Signed with today's date, and notes that flag the two screening answers), the login with the role Foster linked to it, the set-password link (7 days) and the email. A failure half way is finished by approving again.
- **Admin page.** The Fosters page (sidebar item Fosters, Admins) is the Users page component for fosters only, with an Applications tab (view the answers, Approve, Reject with a reason), Add Foster, and Resend sign-in link. The Users page no longer lists fosters, and a foster can no longer be created from its role picker.
- **Foster sign-in and portal.** `/foster/login` and `/foster/set-password`, and the portal home `/foster` (My Foster Cats). The home only says that cats will be listed there: the cats and the Kitty Profile come in phases 3 and 4.
- **Role change.** Foster is now a portal-only role (`PORTALS` in `src/constants/roles.js`). On the sign-in, each page lets only its own role in: a foster on the staff or rescuer page is told to use the foster page, and a staff account on a portal page is told to use the main page. A signed-in foster is refused on every staff route (403 PORTAL_ONLY), on the rescuer portal and on the foster application list. The rescuer sign-in behaves as before.
- **Notification.** A new type Foster Application for the bell, sent to every active Admin.
- **Emails.** Received, approved (with the link) and rejected, in `fosterEmails.js`. The wording is ours and should be seen by the client.

### What it needs to work

- `fosters` in `DATABASE_BOARDS` on the server (the approve and Add Foster routes answer 409 otherwise).
- `APP_BASE_URL` and Mailgun set on the server, as for rescuers. Without APP_BASE_URL the approval works but the email reports that no link could be made.

### Tested

- **Form rules (13 checks):** valid answers, the empty form, a statement answered No, the two screening questions, the conditional details, a missing reference phone, a bad email, the length limit, and the cleaning of hidden and unknown answers.
- **The text for the Fosters board (5 checks):** the address, the emergency contact, the three references, the flags in the notes, and the agreement.
- **Roles and portals (6 checks).**
- **Routes (live, isolated app, Mailgun off, 37 checks):** the bot trap, validation, a new application, the same email again, a rejected email applying again, list and view, reject (reason needed, twice, approving a rejected one), approve (the Fosters row, the Users row, the application row, the agreement, the flags), approving twice, an approved email applying again, Add Foster (no agreement recorded, used email, bad email, missing name), resend link, and a non-admin refused.
- **Sign-in on a real second server instance (12 checks):** the set-password link sets the password and works once, a foster is refused on the staff and rescuer sign-in pages and told where to go, a wrong password gives the generic 401, a foster signs in on the foster page, and is refused on staff routes, the application list and the rescuer portal.
- Everything the test made was removed afterwards: the Users and Fosters records from the database and Monday, the applications, the email log, and the activity entries and bell notifications that the application sent to the real Admins (their queued Monday creates too).

### Not tested

- The pages in a browser: the public form, the Fosters page, the sign-in and the set-password pages.
- A real email. Mailgun was off in the tests.
- The bell notification as an Admin sees it.
- The staff sign-in of a staff account on the foster page (no staff password was used).

## Phase 3 Result (2026-11-17)

Built and tested on the server. Not deployed, and the row has not been tried in a browser.

- **The row.** The Overview tab of the cat page has a Foster row under the Rescuer row. Hover shows the edit pencil. It picks an Active foster from a list (name and city) or none, and saves with the tick. An error from the server (for example an inactive foster) is shown under the row.
- **Who.** Any staff role that can open the cat page (Admin, Super Admin, Volunteer), the same as the Rescuer row.
- **The rule.** A cat can only be given to a foster that exists and is Active. Clearing the foster is always allowed. A cat whose foster later became Inactive keeps that foster and can still be edited.
- **Storage.** The cat's Linked Foster column on Monday and the database. The foster's link to Cats is kept in step in the database, so one foster can have several cats and moving a cat updates both fosters. The cats list and the cat answer `linkedFoster` (the name) and `linkedFosterId`.
- **Server.** `linkedFosterId` is a writable cat field (`POST /api/cats/:id`), and `GET /api/cats/foster-options` answers the Active fosters, sorted by name. Both need `fosters` in `DATABASE_BOARDS`. The browser's Monday fallback can set the link but cannot list fosters.
- **Not changed.** The cat's free text Foster Contact and Foster Location fields stay as they were. The foster is not notified when a cat is given to them.

### Tested

Live, on throwaway fosters and cats, all deleted afterwards (20 checks): the options (Active only, with the city, sorted), a new cat with no foster, giving a cat, one foster with two cats, moving a cat between fosters (both sides), an Inactive foster, an unknown id, a bad id and the id of a cat all refused, the cats list, a Volunteer, a cat whose foster became Inactive, and clearing the foster. Lint and build are clean.

Not tested: the row in a browser.

## Phase 4 Result (2026-11-17)

Built and tested on the server. Not deployed, and the pages have not been tried in a browser.

- **My Foster Cats** (`/foster`): the cats assigned to the signed-in foster, with the state of the newest Kitty Profile for each (no profile yet, waiting for review, added to the cat, or needs changes with the reason).
- **Kitty Profile** (`/foster/cats/:id/profile`): the client's Kitty Profile form (`src/constants/forms/fosterProfileForm.js`, wording version `2026-11-17-jotform-copy-1`) in 5 steps (household, medical history, litterbox, behaviour, profile), then a sixth step for the photos, videos, passport and vet report. The questions, options and order are the Jotform ones, for one cat. Left out: the foster's name and relationship (known from the login), the cat's name, gender and age (on the cat's record), and the unlabelled first upload question of the Jotform form.
- **Files.** Each file is sent as soon as it is chosen and goes to the cat's Foster Uploads (pending) column, with its kind recorded in `file_uploads`. Limits (`src/constants/fosterPortal.js`): up to 10 photos of 10 MB, 5 videos of 20 MB, 1 passport of 10 MB, 3 vet reports of 10 MB, and 25 files in all. A foster can remove their own files until they send the profile.
- **Sending.** The profile can only be sent with at least 6 photos and 3 videos. It is saved in `foster_cat_profiles` as Pending with the cleaned answers and the list of files. While it is Pending the files cannot be added or removed, and a second profile is refused. Every active staff account gets a bell notification (new type Foster Profile) that links to the cat.
- **Safety.** The foster is worked out from their login only. A cat that is not assigned to them answers 404 for every route, and a staff role or an Inactive foster is refused. The portal never shows a file link, because a foster has no Monday login.
- **Not saved on the page.** The answers are kept on the page until they are sent, so leaving it loses them. The files are already on the server and stay.

### Two fixes that came with this phase

- **Deleting one of several files failed.** `setColumnFiles` (`server/mondayFiles.js`) sent only asset ids, but Monday requires each file's name. Deleting the last file of a column worked and deleting one while others remained failed with a Monday error. This affected the contract files, the post-adoption photos and the call transcripts. It now sends the names.
- **A form's problems in an error reply.** `answer()` in `server/httpAnswer.js` now sends an error's `fields` (the problems of a form) with the 400, as the other public forms did.

### How a file moves to the cat (phase 5)

Tested on a throwaway cat on 2026-11-17: setting a file column with the asset id of a file that is in another column of the same item makes a copy in that column with a **new asset id**, and the original stays until its own column is set again. Apply will copy each file into the cat's Photos, Videos, Passport File or Medical Documents column, record the upload details under the new id, and then clear the pending column.

### Tested

- **Form and rules (21 checks):** valid and empty answers, optional health checks, the conditional questions (bite details, medication, other animals and the counts of the animals met), an option outside the list, number and length limits, cleaning, the file rules and the minimums.
- **Server (35 live checks, throwaway foster, cats and files, all deleted):** a staff role refused, only my cat listed, another foster's cat and an unassigned cat answering 404 on every route, an Inactive foster refused, upload checks (no kind, unknown kind, no file, wrong type, a second passport), real uploads of 6 photos and 3 videos to Monday, deleting a file, validation of the answers with their fields, the missing files named, a successful send, the stored row and its file list, a second profile and file changes refused while one waits, the list and the cat showing the Pending profile, and the bell notification to staff.
- Everything the test made was removed afterwards, including its notifications and activity entries.

### Not tested

The three pages in a browser, and the profile as staff would see it (phase 5).

## Phase 5 Result (2026-11-17)

Built and tested on the server. Not deployed, and the screens have not been tried in a browser.

- **Foster submissions card.** The Overview tab of the cat page shows a card at the top when a foster has sent a profile for the cat. Each profile shows its state (Pending, Applied or Sent back), the foster, the date and who dealt with it. Any staff role that can open the cat can use it.
- **Review.** Review opens the profile read-only: the answers page by page and the files by kind. The files of a waiting profile have links (staff have a Monday login).
- **Apply to the cat.** The server proposes a value for each cat field the answers say something about, and staff see it next to the current value. They tick the fields to change and can edit any proposed value. A field is ticked by default only when the cat has no answer yet (or, for the two long texts, because they are added after what is there). The files can be moved or left where they are.
- **Send back.** The reason (required) is shown to the foster in the portal. Nothing on the cat changes and the foster's files stay, so they can fix the profile and send it again. The newest profile of a cat is the one the portal shows.
- **Files.** Apply copies the photos to Photos, the videos to Videos, the passport to Passport File and the vet report to Medical Documents, after what is already there. The pending column is then cleared. Each copy keeps its upload record (who sent it) and a note that names the profile. A file already copied by an interrupted Apply is not copied twice.
- **Changes and logging.** The fields are saved with the usual cat change logging. Apply and Send back also write an entry on the cat's activity log.
- **Safety.** Only the profile's own fields can be changed: a name, status or any other field is refused. A select value must be one of its options. A long text must fit Monday (see below). A click that arrives while another is applying the same profile is refused (409), and a failure half way releases the profile so it can be tried again.

### What each answer proposes

| Cat field | From the answers |
|---|---|
| Personality summary | The written profile. |
| Child friendly, Cat friendly, Dog friendly | What the foster ticked for children, other cats and dogs: anything worrying (Aggressive, Fearful, Absolutely No) gives No, else Friendly or Essential gives Yes, else Cautious, Submissive or Tolerates gives Sometimes. Only "I don't know" proposes nothing. |
| Lap cat | Yes, often: Yes. Yes, sometimes and Rarely: Sometimes. Never: No. |
| Energy level | How the cat plays: Gentle gives Medium, Somewhat rough and Very rough give High, Does not play gives Low. |
| Indoor only | Where the cat lives: Indoor only gives Yes, otherwise No. |
| Vaccinated | Yes when Rabies Vaccinated or PCH Booster is ticked. |
| Sterilised | Spayed or neutered: Yes or No. |
| FeLV status, FIV status | Positive when FeLV+ or FIV+ is ticked, Negative when the Negative one is. |
| Medication required | Yes or No. |
| Medical summary | The conditions, the medication or diet and the ticked health checks, added after what is there. |
| Special notes | A short block with the answers that have no field: household and other animals, behaviour in each situation, the personality words, best and worst quality, bites, how the cat lives and plays, litter, food, other information and the ideal family. Long answers are shortened, and the full answers stay on the profile. |

### Monday keeps 2000 characters

A Monday long text column keeps at most 2000 characters and silently drops the rest, without an error (tested on 2026-11-17). The Apply dialog therefore shows a counter for each text, Apply refuses a longer one with its length, and a text that would pass the limit is not ticked by default. The notes block for ordinary answers is about 650 characters. This limit also affects the rescuer portal, whose text limits are 4000: a longer text is cut at 2000 when it syncs to Monday. That is not changed here.

### Tested

- **The mapping (22 checks):** the friendliness rule, each proposal and whether it is ticked by default, the added texts, the 2000 limit, clipping of very long answers, and nothing proposed for an empty profile.
- **Review (live, 39 checks, real uploads and moves on Monday, throwaway foster and cats, all deleted):** listing with the files and their links, 404s for a wrong cat, refusals (a field outside the list, a value outside its options, a text over 2000, an empty text, a wrong shape), the profile staying Pending and not locked after refusals, Apply with an edited value, the cat's fields and its 6 photos, 3 videos, passport and vet report moved with their names and upload records, the pending column empty, the profile Applied with the reviewer, a second Apply and a Send back of an applied profile refused, the retry safety of an interrupted Apply, the foster seeing the result, Send back (reason required and limited), the foster keeping the files and then changing them and sending a new profile, and the newest profile shown.
- Everything the test made was removed afterwards, including the notifications and activity entries.

### Not tested

The screens in a browser (the card, the review dialog, the Apply dialog with its counters and the Send back dialog). An Apply that fails half way (the retry safety was tested on its own).

## Phases

1. **Structures.** Done. The Monday board and columns, the database mirror, the board constants and the foster applications table.
2. **Application and approval.** Done. The public form, the Fosters page with its Applications tab and Add Foster, the emails, the foster sign-in and set-password pages, and the role change.
3. **Cat assignment.** Done. The Foster row on the cat page.
4. **Portal and Kitty Profile.** Done. My Foster Cats, the profile form and the held files.
5. **Staff review.** Done. The Foster submissions card and Apply.

## Open Points

- The Foster Compliance form is signed with Jotform Sign on Jotform. In the app the signature is a typed name, as in the other public forms.
- Whether a foster may update a profile already applied. The first version allows a new submission at any time, and each one is reviewed.
- The foster is not emailed when a profile is applied or sent back. They see the result in the portal.
- The foster's answers are not saved on the page until they are sent.
- Foster emails reuse the Mailgun setup of the rescuer emails. The wording of the three emails (received, approved, rejected) is ours and should be seen by the client.

## Note: Row-Level Security (2026-11-17)

While adding the new table, 9 older app tables were found without row-level security, which lets Supabase's public API read and write them: `ai_runs`, `application_calls`, `call_transcripts`, `cat_update_clock`, `file_uploads`, `jotform_submissions`, `jotform_webhook_events`, `post_adoption_chase` and `post_adoption_testimonial`. One of them holds applicants' answers. They are now all enabled, and every table is listed in `server/scripts/databaseSchema.js`, which enables it on each run. The app's own connection (the `postgres` role) bypasses row-level security and was checked to read and write them as before. A new app table must be added to that list.
