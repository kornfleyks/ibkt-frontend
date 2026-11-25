# Wix Integration

Status: the first step is built (2026-11-24): the app can receive the Wix rescuer form. The rescuer pack email and the link to the pre-signup form are not built.

## Rescuer form to the app

Wix sends each submission of the rescuer form to the app, and the app stores it.

1. In Wix, create an Automation whose trigger is the rescuer form submission.
2. Add the action "Send HTTP request" with the method POST and this address:
   `https://<app server>/api/webhooks/wix/rescuer-form/<WIX_WEBHOOK_SECRET>`
3. Send all automation data, so every form field is included. The app expects the body under a `data` object (the default) and also accepts a body without it.

The server (`server/wixRescuerForm/`) checks the secret in the address, stores the submission in the table `wix_rescuer_submissions`, and answers 200 at once. A wrong secret gets a 404. A body that is empty gets a 400, and a body over 100 KB gets a 413. The same submission received twice is stored once.

An Admin can read what was received with `GET /api/wix-rescuer-submissions`.

## Reading the rescuer requests from Wix

The automation only runs when its trigger fires, so the server also reads the Wix collection `RescuerRequests` (the collection that stores the form's submissions) with the Wix Query Data Items API (`server/wixRescuerForm/pull.js`). It does this every 10 minutes and stores each item that is not stored yet. An item that the automation already delivered is not stored twice.

An Admin can start a read at once with `POST /api/wix-rescuer-submissions/pull`.

The call needs `WIX_API_KEY` (a Wix API key with permission to read Wix Data) and `WIX_SITE_ID`, which the server sends in the `Authorization` and `wix-site-id` headers. The collection can be changed with `WIX_RESCUER_COLLECTION_ID`. Without the key and the site id, nothing is read.

A collection item has the fields `title` (the name), `email`, `phone`, `rescueLocation`, `numberOfCats`, `submissionId`, `submittedOn`, `contactId`, `approve`, `decline` and `emailSent`. The app stores them as columns and keeps the last three as answers. It does not act on `approve`, `decline` or `emailSent`.

## Rescuer pack email

After each read, the server sends the rescuer pack email to every new submission that has an email address (`server/wixRescuerForm/packEmail.js`). Wix Triggered Emails can only be sent from code on the Wix site, so the email is sent with the Wix Email Transmissions API as a transactional message, without an unsubscribe link. The API key needs the permission Manage Email Marketing.

The column `pack_email_status` of `wix_rescuer_submissions` shows the result: `pending`, `sending`, `accepted` (Wix accepted it), `sent` (Wix reports it as sent), `failed`, or empty for a row that is never emailed. The columns `pack_email_attempts`, `pack_email_sent_at` and `pack_email_error` hold the attempts, the time and the reason for a failure. A failed send is tried again on the next read, up to 3 attempts.

Nothing is sent unless `WIX_PACK_EMAIL_ENABLED` is `true` and `WIX_PACK_URL` is set. `WIX_PACK_SENDER_EMAIL` (an address verified in Wix), `WIX_PACK_SENDER_NAME` and `WIX_PACK_REPLY_TO` are optional. The wording of the email is in `emailOf` in `packEmail.js` and is a draft.

## Why the secret is in the address

Wix's help article for the "Send HTTP request" action does not mention request headers or signing, so the app cannot rely on a header. The Jotform and Monday webhooks of the app also use a secret in the address.

The address can appear in logs on the Wix side, so the secret should be a long random string and should be replaced if it is exposed.

## Storage of the submission

The app stores each submission as columns in the table `wix_rescuer_submissions` (`server/wixRescuerForm/store.js`):

- the Wix submission id, contact id, form id and form name, and the time of the submission;
- first name, last name, email and phone;
- where the person rescues from, and how many cats they want to rehome;
- the form's own answers as a list of label and value, in the form's wording.

The name, email and phone come from the Wix contact (`data.contact`) first and from the answers (`data.submissions`) second. The two rescue answers are found by the wording of their label ("rescue from", "community" or "city", and "how many cats"), because Wix gives every field an id with a random ending. If those questions are renamed in Wix, the matching columns stay empty, and the pattern in `structureSubmission` must be updated.

The rest of the Wix payload (site information, links, the PDF) is not kept. The whole payload is kept in the column `payload` only when the email or the name cannot be read from it, so that an Admin can look at it.

## Configuration

`WIX_WEBHOOK_SECRET` in `server/.env`: a long random string. Without it, every request gets a 404.

## Other Wix options that were checked

Wix also has a "Submission Created" webhook for Wix Forms. It is signed with a public key and is set up through a Wix app (a custom app with the Forms read permission), not through an Automation. It needs a response within about 1.25 seconds and repeats failed deliveries. It would be the choice if signing becomes a requirement.

Sources: Wix Automations help article "Sending an HTTP Request", and the Wix developer documentation for the Form Submissions "Submission Created" webhook and for handling webhook events.
