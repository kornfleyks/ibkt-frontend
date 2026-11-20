# Testimonial Requests

Status: built and tested on the server 2026-11-17. The table `post_adoption_testimonial` was created in the database the same day. It is not deployed, and the new section has not been tried in a browser.

The client brief lists "Testimonial requests" under post-adoption, with no further detail. The Post Adoption tab now has a Testimonial section where staff record that a testimonial was requested, chase it, and keep the text the adopter sent.

## Decisions (2026-11-17)

| Topic | Decision |
|---|---|
| Who asks | Staff ask the adopter themselves, outside the app. The app reminds the owner and does not email or message the adopter. |
| When | Staff choose. There is no automatic timing, and the section is available at any time. |
| What is kept | The status, the dates, the number of requests, the testimonial text, and whether the adopter agreed to its publication. |
| Chasing | The same rule as the check-ins: a reminder every 3 days and at most 3 requests (`src/constants/postAdoptionReminders.js`). |

## States

| Status | Meaning |
|---|---|
| Not requested | There is no row for the record. This is the starting state. |
| Requested | Staff asked the adopter. The request counts as attempt 1. |
| Received | The testimonial text was recorded, with the permission to publish (yes or no). |
| Declined | The adopter does not want to give one. |
| No response | Three requests had no reply, so chasing stopped. |

The buttons on the tab, and what each one does:

- **Mark as requested** (or **Request again** after Declined or No response) sets Requested with attempt 1.
- **Asked again** adds one request to a Requested testimonial, up to 3.
- **Record testimonial** saves the text and the permission to publish, and sets Received. It works from any state except Received.
- **Declined** sets Declined.
- **Edit** changes the text or the permission of a Received testimonial.
- **Reset** removes the request and the text. A Received testimonial asks for confirmation first.

The rules are in `server/postAdoption/testimonialRules.js`. The text is at most 5000 characters.

## Reminders

The daily post-adoption check (`server/postAdoption/reminders.js`) also runs `server/postAdoption/testimonialReminders.js`. For a Requested testimonial:

- 3 days after a request, with fewer than 3 requests, the owner gets a bell notification to ask the adopter again. Each request gets one reminder.
- 3 days after the third request with no answer, the status becomes No response and the owner is told.

The owner is the record's Post-Adoption Owner. With no owner, the application's Case Owner and all Admins are told. Each step is claimed in the database first, so a restart, or two servers, never remind twice. The notifications use the existing post-adoption reminder type and link to the Post Adoption tab.

## Data

The table `post_adoption_testimonial` (app-only, not sent to Monday) has one row per post-adoption record that has a request. Its columns are the status, the number of requests, the dates, the text, the permission to publish, and who and when it was last changed. The SQL is in `server/scripts/databaseSchema.js`. The text is not written to the activity log, only that a testimonial was requested, received, edited or reset.

## Endpoints

- `GET /api/applications/:id/post-adoption` now also answers `testimonial`, the state or null.
- `POST /api/applications/:id/post-adoption/:recordId/testimonial` takes `{ action, text?, mayPublish? }`, where `action` is request, chase, receive, decline, update or reset. It answers `{ testimonial }`, with null after a reset.

Both are limited to Admins and the application's Case Owner, like the rest of the tab.

## Not Changed

- Nothing is sent to the adopter. Emailing a request needs client-approved wording and a way for the adopter to reply, and is part of the larger email item.
- Nothing publishes a testimonial. The permission is only recorded.
- The two older post-adoption records have no row, so they show Not requested.

## Testing

- **Rules (24 checks):** every action from every state, the attempt limit, trimming, the length limit, the permission type and the refusals.
- **Reminder plan (8 checks):** the due day, nothing earlier, one reminder per attempt, the cap, and ignored statuses.
- **Database (live, made-up record ids, removed):** claims by five servers at once give one winner, a chase restarts the reminder, the cap is claimed once, a new request after No response restarts, and text with quotes is stored exactly.
- **Daily check (live, stand-in notifications, nobody notified):** two chase reminders, the owner or the Case Owner and Admins told, no repeat on the same day, the cap becoming No response, and nothing more afterwards.
- **Routes (live, on a throwaway post-adoption record on the test application, deleted afterwards from the database, Monday and the queue):** every action, the refusals, a record that is not on the application, and the stored row.

Not tested: the bell notification itself, and the section in a browser.
