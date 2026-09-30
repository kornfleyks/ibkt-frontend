# Send Adoption Form

Status: **built** (2026-09-30), table created; not yet tested end to end.

Once a volunteer has reviewed an application and marked it **Active**, they send the applicant the second-stage Jotform form. Before this, they built and sent the link by hand. Now the application page has a **Send Adoption Form** button.

## Decisions (2026-09-30)

| Topic | Decision |
|---|---|
| Which form | From the application's country: **UAE Adoption Form & Agreement** (`202981102716450`) for the UAE, **Adoption Form and References** (`211304838746458`) for everyone else. The volunteer can pick the other one (a warning shows). |
| Delivery until email is connected | Both: **Copy link** (paste into their own email) and **Open in email** (a `mailto:` with the applicant's address, subject and body ready). Either one records the send. |
| When | Only while the application is **Active Application**. |
| Stage | Sending does **not** change the stage. |
| Resend | Allowed; every send is kept (history in the dialog, "Sent ... by ..." on the button's hover). |
| Who | Admins and the application's Case Owner. |
| Storage | App-only table `adoption_form_invites` (application, form, method, link, who, when), plus an Activity log entry. No Monday columns or calls. |
| Application id in the link | Yes: the link fills a hidden Jotform field `ibktapplicationid`, which must be **added by hand to both Jotform forms** (below). |

## The pre-filled link

Built in `src/constants/forms/adoptionForms.js` (`adoptionFormLink`), by the server:

- Name: from the saved Pre-Adoption answers (first / last) when there are some, else the application name split at the last word.
- Email, phone (the whole international number), city and country: from the application.
- Street, second line, state and postcode: only from the saved Pre-Adoption answers (the Address column is one joined line that can't be split back reliably).
- Cat: the linked cat(s), else the Pre-Adoption "Which cats are you interested in?" answer.
- `ibktapplicationid`: the application id.

Jotform ignores parameters for fields a form doesn't have, so the link works before the hidden field exists.

## To do on Jotform (by hand)

On **both** forms, add a **Hidden Box** field (Form Elements > Hidden Box) and set its **Unique Name** (field Properties > Advanced) to `ibktapplicationid` (Jotform lower-cases it). Nothing else changes for applicants. If the name changes, change `APPLICATION_ID_FIELD` in `adoptionForms.js`.

## Later

- **Email service** (Mailgun / Brevo / Resend, domain `ittybittykittytails.com` on Wix DNS): add a `method: "email"` path to `POST /api/applications/:id/adoption-form/sends` and an **Email** button. Nothing else changes.
- **Receiving the submissions**: both forms send to the webhook (added 2026-09-30), so submissions are stored as `received`, but the `adoption_references` / `new_application` handlers in `server/jotform/` are empty. When they are built, match by `ibktapplicationid` first, then email.

## Steps

- [x] 1. Shared form definitions and link builder (`src/constants/forms/adoptionForms.js`)
- [x] 2. Table in `scripts/databaseSchema.js`, store `server/adoptionForm/invitesStore.js`
- [x] 3. Routes `server/adoptionForm/routes.js` (GET state, POST sends), registered in `index.js`
- [x] 4. Button + dialog (`src/components/ActiveApplications/SendAdoptionForm/`), wired in the application header
- [x] 5. Postman requests, server README
- [x] 6. Table created with `node scripts/databaseSchema.js` (2026-09-30, user go-ahead)
- [ ] 7. Test end to end (server, then browser)
- [x] 8. Hidden field added on both forms (q174 Adoption Form and References, q188 UAE; name `ibktapplicationid`), webhooks added on both (verified 2026-09-30)
