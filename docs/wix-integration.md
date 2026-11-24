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
