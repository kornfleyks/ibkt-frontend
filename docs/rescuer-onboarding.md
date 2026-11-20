# Rescuer Onboarding and Rescuer Portal

Status: **design only** (2026-10-16). Nothing built. Open points at the bottom need answers before coding.

Source: client brief Part One (rescuer onboarding does not exist, it is all WhatsApp). Gaps named there: no structured rescuer record, no single place for legal and permission capture, no follow-up.

## Goal

Before a rescuer can add cats, they apply through a form, an Admin approves or rejects, they are emailed either way, and an approved rescuer gets a separate sign-in to a small portal where they add cats and see (read-only) the cats they have added.

## Decisions (2026-10-16, don't re-ask)

| Topic | Decision |
|---|---|
| Login storage | Users board, Role = Rescuer. Reuses login, lockout, password reset, suspend, Users admin page. Separate login URL and portal layout. |
| Form home | In the app, a public page. Saved to an app table. No Jotform. |
| Reviewers | Admin and Super Admin only (via `isAdminRole`). |
| Consents | Five required Yes/No radios in the style of the client's Foster Compliance form (Jotform 260843004451044). Only Yes can submit, so every approved rescuer has all five as Yes. |
| Agreement | No rescuer agreement exists, so we draft it as required Yes/No statements on the form (client approves wording). No external document, no upload. |
| First password | Approval email carries a set-password link valid 7 days. The rescuer chooses their own password. An Admin can resend a fresh link if it expires. |
| Re-applying | A rejected email may apply again at any time. Blocked while an application is Pending and after approval. Earlier rejections stay visible to Admins. |
| Existing rescuers | Ignored. Approval always creates a new Rescuers record, no email matching, no invite for old records. Existing records are left untouched (deleting them is a separate task: check linked cats and the database copy first, ask before any delete). |
| Cat fields | Rescuer fills: name, gender, age, breed, colour, personality summary, energy level, lap cat, child/cat/dog friendly, indoor only, vaccinated, sterilised, FeLV, FIV, medication required, medical summary, microchip, foster contact and location (optional), special notes. Files: photos, videos and medical documents (size and count caps). Staff only: status, rescuer link, bonded cats, adoption ready, passport. |
| My Cats page | Each row: name, photo, date added, status (read-only). A Contact IBKT line with the support email. No details view, no staff notes, nothing editable. |
| Lockdown scope | Only the Rescuer role is locked out of staff pages and endpoints. Foster and Adopter are left as they are until the client decides what they get (roles-analysis-pending). The guard is written as a list of blocked external roles so more can be added later. |
| Forms page | Built 2026-10-16: sidebar item Forms (Admin, Volunteer) listing public form links with Copy and Open. Starts with the Rescuer Application, more forms are one entry in src/constants/forms/formLinks.js. |
| Rescuers page | Sidebar item Rescuers (Admin), separate from Users, same functionality as the Users page (status tabs, edit name and email, status actions, set password, details drawer, Send Test Email, Delete) built by turning the Users page into one shared component configured by role. Users page then excludes Rescuers (and its role picker no longer offers Rescuer). Rescuers page has no role picker. |
| Add Rescuer | Admin can add a rescuer directly (skips form and review): creates the Rescuers record and the login and emails the 7-day set-password link. Uses the same approval service as step 3. Consent columns are left unset because no agreement was answered. |
| Applications tab | Pending rescuer applications are reviewed in an Applications tab on the Rescuers page (Approve, Reject with reason). The bell notification links to that tab. No separate Rescuer Applications sidebar item. |
| Breed and colour (rescuer) | Pick from the lists or type their own; a typed value is saved in the cat's Special Notes ("Breed: ...") and the dropdown stays empty, so nothing joins the shared lists. Decided 2026-10-16 because the live lists are tiny (breed: stray; colour: red, blue, black). |
| My Cats photos | Shows photo, video and document COUNTS, not thumbnails: Monday file links need a Monday login, which a rescuer does not have. Thumbnails would need a server image proxy (not built). |
| Cats a rescuer adds | Normal Cats record, status Intake, linked to the rescuer. Not listed until staff review it. Rescuer sees it read-only. |

## Flow

1. **Apply.** Public page `/become-a-rescuer`, no login. Saves a row in `rescuer_applications` (status Pending) and emails the applicant "we received it".
2. **Notify.** Admins get a bell notification (Notifications board, same trigger style as task and case notifications).
3. **Review.** Admin page `/rescuer-applications`: list with status filter, detail view (read-only answers), Approve, Reject (reason required).
4. **Reject.** Status Rejected, reason and reviewer stored, rejection email sent. The applicant may apply again with the same email (see open point 3).
5. **Approve.** One server operation:
   - create the Rescuers board record (status Active, consent columns copied from the answers)
   - create a Users record: Role Rescuer, Account Status Active, Linked Rescuer set, no password yet
   - create a set-password token (reuse `server/passwordReset/tokens.js`, longer expiry)
   - email the link to the rescuer's own sign-in page
   - mark the application Approved, store reviewer and time, link it to the created Rescuers record and user
6. **Sign in.** `/rescuer/login`, separate page and look. Same `POST /api/login` underneath, but a Rescuer account is refused on the staff login page and a staff account is refused on the rescuer page, so each audience sees only its own door.
7. **Portal.** Two pages inside a minimal layout (no admin sidebar):
   - **Add Cat**: trimmed version of the Add Cat form, rescuer is set automatically and cannot be changed.
   - **My Cats**: read-only list of cats linked to this rescuer. No edit, no delete, no open-in-workspace.

## Application form content (DRAFT for client approval)

Decision 2026-10-16: no rescuer agreement exists today (onboarding is WhatsApp only, none of the 31 Jotform forms covers it), so the agreement is written by us as Yes/No statements on the form, in the style of the Foster Compliance form. All wording below is a draft and must be approved by the client (and ideally checked legally) before go-live. Every statement is a required Yes/No and only Yes can submit.

### Step 1: About you
1. First name (required)
2. Last name (required)
3. Email (required)
4. Phone (required)
5. WhatsApp number (optional, "same as phone" option)
6. Country (required)
7. City (required)
8. Preferred contact method: Email / WhatsApp / Phone (required)

### Step 2: Your rescue work
9. Tell us about the cats you rescue and want to rehome: roughly how many, and where they come from (required, long text)
10. Do you work on your own or with a group or organisation? If a group, its name (optional)
11. How did you hear about Itty Bitty Kitty Tails? (optional)
12. Anything else we should know (optional)

### Step 3: Agreement (each a required Yes/No)
Maps to the Rescuers board columns in brackets.

Rescuer Agreement (sets Rescuer Agreement Signed to Signed when all are Yes):
- A1. I will give IBKT accurate and complete information about every cat I submit.
- A2. I understand that IBKT decides which cats are listed and when, and that a listing is not a guarantee of adoption.
- A3. I will direct all adoption enquiries for cats I submit to IBKT and will not rehome them privately.
- A4. I will respond to IBKT messages within 48 hours. (Decided 2026-10-16; the foster form uses 24 hours. Client to confirm.)
- A5. I will tell IBKT promptly if a cat's health, location or circumstances change.
- A6. I will tell IBKT if I can no longer care for a cat so a plan can be made together.

Consents (one board column each):
- C1. Vet permission: I give IBKT permission to arrange veterinary care for the cats I submit if needed. (Vet Permission Granted)
- C2. Media usage: I give IBKT permission to use photos and videos of the cats I submit on its website and social media. (Media Usage Permission)
- C3. Medical disclosure: I will share everything I know about each cat's health, and I accept responsibility for the accuracy of that information. (Medical Disclosure Accepted)
- C4. Financial responsibility: I understand that costs for a cat are agreed with IBKT before they are incurred, and that IBKT will not reimburse costs unless it has agreed to them in advance. (Financial Responsibility Accepted. Decided 2026-10-16; deliberately states no policy on who pays what. Client to confirm.)

### Step 4: Declaration
- D1. I confirm that all the information I have given is accurate and truthful. (required Yes/No)
- Typed full name and date as the declaration. No drawn signature for now (a signature is a later option).

### Still to settle in this form
- Whether to ask for references or an emergency contact, as the foster form does (not proposed here: a rescuer is a source of cats, not someone caring for IBKT's cats).
- Emails sent to the applicant when the form is submitted, approved or rejected use the same wording review.

Stored as one column per question plus a raw JSON copy, as Add Application does, together with the wording version the applicant saw, so a later wording change never rewrites what someone agreed to.

## Data

New app-only table `rescuer_applications` (added to `scripts/databaseSchema.js`): id, status (Pending / Approved / Rejected), the answers, submitted_at, reviewed_by, reviewed_at, reject_reason, rescuer_id and user_id (set on approval), ip hash (for the rate limit). No Monday columns needed for the application itself: the Rescuers board record is only created on approval, which keeps Monday calls low (see monday-daily-limit-testing).

Existing columns used on approval: Rescuers (name, first and last name, email, phone, WhatsApp, country, city, preferred contact, the five consent statuses, status Active, notes). Users (name, email, role, account status, Linked Rescuer). Nothing new on Monday.

## Server

New module `server/rescuerOnboarding/` (routes, store, approval service), registered in `index.js` like the other feature modules. Approval logic is its own service so the route stays thin and it can be tested without Express.

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/public/rescuer-applications` | none, rate limited + honeypot | submit the form |
| `GET /api/rescuer-applications` | Admin | list |
| `GET /api/rescuer-applications/:id` | Admin | detail |
| `POST /api/rescuer-applications/:id/approve` | Admin | create rescuer + user, send email |
| `POST /api/rescuer-applications/:id/reject` | Admin | reject with reason, send email |
| `POST /api/rescuer-portal/cats` | Rescuer | add a cat for this rescuer |
| `GET /api/rescuer-portal/cats` | Rescuer | cats linked to this rescuer |
| `POST /api/set-password` | token | rescuer sets first password |

Approve is idempotent: a second click on an already approved application returns the existing result and does not create a second user or rescuer.

## Access control (the important part)

Today `Rescuer` is allowed in the route and nav lists for most pages (`navigation.js`, `AppRoutes.jsx`) and any signed-in user can call `/api/cats`, `/api/monday`, `/api/upload`. A rescuer account must not reach those.

- Server: a guard on every existing authenticated route group that refuses roles in a blocked-external-roles list (Rescuer only for now); Rescuer tokens get 403 everywhere except the `rescuer-portal` routes, their own account page and logout. Done in one place (middleware), not per route.
- Portal routes always derive the rescuer from the token (Users Linked Rescuer), never from a client-sent id, so a rescuer cannot add or read cats for someone else.
- `POST /api/rescuer-portal/cats` accepts only an allow-list of fields (name, gender, age, breed, colour, health and vaccination basics, personality, photos). Status is forced to Intake and rescuer to the caller.
- Frontend: remove `Rescuer` from staff route and nav role lists, add a separate portal route tree and layout. The server check is the real gate, the frontend part is usability.
- Suspending the user or setting the rescuer to Inactive blocks the portal immediately (live account state, see auth-suspend-not-instant).

## Emails

Three templates through `server/mail/` (same `sendOrLog` path, so Activity Log and `email_log` record each send): application received, rejected (with the reason, wording needs approval), approved (with set-password link). Fire-and-forget like registration emails, but approve shows the Admin whether the email went out so they can resend.

**Assumption (user, 2026-10-16):** Mailgun is treated as completed, with a verified sending domain, so applicant emails reach real addresses. If the server is still on the sandbox values when this is built, switch the env vars and the from address first.

## Security notes

- Public endpoint: per-IP rate limit, honeypot field, strict length caps, nothing echoed back, no user enumeration (same response whether the email exists or not).
- Set-password token: random, only a hash stored, single use, expires, reusing the password reset storage.
- Applicant data is PII and legal consent: Admin only, never in the generic proxy or the database table viewer's open output.

## Build order (revised 2026-10-16)

Steps 2 and 3 now include the Rescuers page: the Applications tab is the review screen, and the approval service is shared by Approve and Add Rescuer. The Users page is first turned into a shared component (no behaviour change for Users), then the Rescuers page uses it.

Original order:

1. Table, store, public submit endpoint, form page, received email (BUILT 2026-10-16, endpoint tested, page not yet viewed in a browser)
2. Admin list and detail pages, reject path and email (server side BUILT and live-tested 2026-10-16: applications list/get, approve, reject, Add Rescuer, resend link, bell notification, emails; the Rescuers page, Applications tab, Add Rescuer, Resend link and hiding Rescuers from Users BUILT 2026-10-16, compiled and linted but not clicked through in a browser)
3. Approve service (rescuer + user + token + email), set-password page
4. Lockdown of existing routes and frontend role lists (BUILT and tested 2026-10-16: requireAuth refuses portal-only roles with 403 PORTAL_ONLY on every route, requireAnyAuth is opted into only by logout and the session stream; login takes `portal: "rescuer"`; 24/24 checks with throwaway accounts)
5. Rescuer login page, set-password page, portal layout (BUILT 2026-10-16: /rescuer/login, /rescuer/set-password, PortalLayout, RescuerRoute; not clicked through in a browser), Add Cat, My Cats (BUILT 2026-10-16: server/rescuerPortal/routes.js tested live 26/26, pages RescuerCats and RescuerAddCat; not clicked through in a browser)
6. Postman collection, server README, review-items entry, tests

## Open points (need answers before coding)

1. **Form wording.** DONE as a draft 2026-10-16 (A4 = 48 hours, C4 = costs agreed in advance). Needs client approval before go-live.
2. **Approval email link.** DONE: set-password link, 7 days, Admin can resend.
3. **Re-applying.** DONE: allowed after rejection, blocked while Pending or after approval.
4. **Existing rescuers.** DONE: ignored, always create new. Optional later clean-up: review and delete the old records (ask first).
5. **Cat fields.** DONE (see decisions). Risk: files add to Monday storage, which the Jotform research says is near or over the plan limit. Check storage and set caps before build.
6. **Not-listed rule.** CHECKED 2026-10-16: Intake already keeps a cat out of Matching (only Adoption Ready cats with no adopter are matched, MatchingService.js). The app has no public listing, listing online happens outside it. Staff still see Intake cats on the Cats page. Nothing extra needed for the rescuer flow. Not checked: whether the brief rule "prevent listing unless all required fields complete" is enforced anywhere.
7. **Portal extras.** DONE: name, photo, date added, status, Contact IBKT line.
8. **Mailgun domain verification.** DONE by decision: treated as completed from now on.
9. **Roles clean-up.** DECIDED: lock down Rescuer only for now. Foster and Adopter unchanged. Known gap left open: a self-registered Adopter can still reach staff data.
