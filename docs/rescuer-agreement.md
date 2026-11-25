# Rescuer Agreement

Status: built (2026-11-25). The wording of the agreement and of the emails is a placeholder until the client sends the final text.

## Flow

1. A visitor fills in the rescuer form on the Wix site, and the request is stored by the Wix integration (`docs/wix-integration.md`).
2. The visitor receives the rescuer support pack and arranges a call with Mia.
3. After the call, an Admin opens Rescuers, then the Applications tab, and presses "Approve and send agreement" on the request in the list "Requests from Wix".
4. The person receives an email with a link to the agreement page (`/rescuer-agreement/<code>`). The link works once and expires after 14 days.
5. The person ticks at least one point of the agreement, types their full name, and signs.
6. Signing makes a link to sign up to Oriel (`/become-a-rescuer/<code>`). The person is taken to that page, and also receives the link by email together with a copy of the signed agreement. The link works once and expires after 14 days.
7. The sign-up page works only with that link. Its email comes from the agreement and cannot be changed.

## Settings

| Setting | Meaning | Default |
|---|---|---|
| `RESCUER_AGREEMENT_LINK_DAYS` | Days the link to the agreement works | 14 |
| `RESCUER_SIGNUP_LINK_DAYS` | Days the sign-up link works after signing | 14 |

Both are read from the server environment each time a link is made, so a change on Render needs only a restart. A value that is missing or not a positive number gives the default.

The agreement text, its version and its points are in `server/rescuerAgreement/config.js` (`AGREEMENT`). The PDF is `public/agreements/rescuer-agreement.pdf`. When the wording changes, raise the version, replace the PDF, and keep the ids of points that mean the same thing.

## What is stored

The table `rescuer_agreements` has one row for each approved request: the email and name, the hash of each link, the expiry times, the result of the last email, and the signature. The signature is the typed name, the time, the agreement version, a SHA-256 fingerprint of the PDF, and the text of each point that was ticked. The IP address is not stored. Only hashes of the link codes are stored, so a copy of the database cannot open a link.

## Endpoints

Admin (`server/rescuerAgreement/routes.js`):

- `POST /api/wix-rescuer-submissions/:id/agreement` makes the agreement link and emails it. Sending it again makes a new link and the old one stops working. It answers 409 when the person has already signed.
- `POST /api/wix-rescuer-submissions/:id/signup-link` makes a new sign-up link and emails it. It answers 409 until the agreement is signed, and after the person has signed up.
- `GET /api/wix-rescuer-submissions` includes the agreement status of each request: none, sent, expired, signed or signedUp.

Public (the code in the address is the only credential, and the rate limiter of `/api/public` applies):

- `GET /api/public/rescuer-agreements/:code` returns the data for the agreement page.
- `POST /api/public/rescuer-agreements/:code/sign` signs it. It needs a typed name and at least one point of the agreement.
- `GET /api/public/rescuer-agreements/signup/:code` returns the name and email for the sign-up page.
- `POST /api/public/rescuer-applications` now needs `signupCode`. Without a valid code it answers 403. The code is used up by the application, and the account is made for the email of the agreement.

## Emails

The emails are sent with the Oriel mail service (`server/mail/rescuerAgreementEmails.js`) and are recorded in the Activity Log and the email log. There are three: the agreement link, the signed copy with the sign-up link, and a new sign-up link. A failed send does not undo a signature. An Admin sees the failure on the request and can send the link again.
