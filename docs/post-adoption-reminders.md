# Post-Adoption Reminders

Status: built and tested 2026-11-11. The table `post_adoption_chase` was created in the database the same day. It is not deployed, and the new buttons have not been tried in a browser.

The client brief asks for reminder logic with 3-day intervals, escalation if there is no response, and stopping after a defined number of attempts. Staff contact the adopters themselves (outside the app). A daily check now reminds them when a check-in is due and when to chase again, and stops after 3 unanswered attempts.

## Decisions (2026-11-11)

| Topic | Decision |
|---|---|
| What is automated | Reminders to staff only. The app does not email or message the adopter. Staff still mark check-ins Sent and Received. |
| Attempt limit | 3 unanswered attempts at one check-in. |
| Who is reminded | The record's Post-Adoption Owner. With no owner, the application's Case Owner and all Admins. Escalations always go to the owner, the Case Owner and all Admins. |
| Interval | 3 days, from the brief. |

The 3 days, the 3 attempts and the 3 reminders to send a check-in are in `src/constants/postAdoptionReminders.js`.

## How It Works

The daily check (`server/postAdoption/reminders.js`) starts 3 minutes after the server starts and then runs every 24 hours. It looks at every post-adoption record whose status is Active, Waiting for Response or Concern and that is not marked Stop chasing.

For each check-in of each record:

- **Due and not sent.** The check-in is Not Due and its due date is today or earlier. The owner is reminded, and again every 3 days, up to 3 reminders. If it is still not sent 3 days after the third reminder, the owner, the Case Owner and the Admins are told that it is being missed.
- **Sent with no reply.** Each time staff contact the adopter it is an attempt. Marking a check-in Sent is attempt 1. After 3 days with no reply, the owner is reminded to chase again. Staff press **Chased again** on the check-in each time they do, which makes it the next attempt.
- **Chasing stops.** After the third attempt, if there is still no reply 3 days later, the check-in becomes No Response, Stop chasing is ticked, Escalation Required becomes Yes (it stays Urgent if it was Urgent), a line is added to the escalation notes, and the owner, the Case Owner and the Admins are told.

Each record gets at most one notification of each kind per day. If several check-ins are due at once, they are listed in one notification. Each step happens once: it is claimed in the database first, so a restart, or two servers running the check, never remind twice. The notifications are bell notifications that link to the Post Adoption tab.

## On the Post Adoption Tab

- A Sent check-in shows "Attempt n of 3", a **Chased again** button, and the date of the next reminder. At attempt 3 the button is replaced by the date when no reply stops chasing.
- Marking a check-in Received, Concern, No Response or Not Due ends its chasing. Marking it Sent again starts a new count at attempt 1, which is also how to resume after chasing stopped.
- Ticking Stop chasing by hand stops all reminders for that record.

## Data

The table `post_adoption_chase` (app-only, not sent to Monday) holds one row per check-in that is being chased or reminded: the attempts, the date it was last sent, the reminders and the escalation. The row is removed when the check-in leaves those states. A check-in marked Sent before this existed has no row and counts as attempt 1 from the last check-in sent date.

## Endpoints

- `POST /api/applications/:id/post-adoption/:recordId/chase` with `{ checkIn }` records another attempt. It is refused unless the check-in is Sent, and after the third attempt.
- `GET /api/applications/:id/post-adoption` and the change route now also answer `chase`, the attempts by check-in.

## Not Changed

- Nothing is sent to the adopter. A later task could email them, which needs email wording approved by the client and a way for them to reply.
- The two existing post-adoption records have no status, so the check ignores them.
- Testimonial requests are a separate item, see `docs/testimonial-requests.md`.

## Testing

- **Timing (30 checks):** the plan of what the check does, for due, reminded, missed, sent, chased, capped, a chase on the same day as a reminder, Stop chasing, every other status, and several check-ins at once.
- **Database (live, made-up record ids, removed):** claims by five servers at once give one winner, and the reminder limits, the new phase on Sent, and the release of a failed escalation behave correctly.
- **Daily check (live, stand-in notifications, nobody notified):** a full sequence of days: due, 3 reminders, missed; sent, two chases, the cap; one notification for several check-ins; no owner; Urgent kept; the cap retried after a failed save.
- **Routes (live, on a throwaway record on the test application, deleted afterwards from the database, Monday and the queue):** Sent, Chased again to attempt 3, the refusals, Received ending the chase, a new phase, and the real cap changing the record.

One bug was found and fixed: a chase on the same day as a reminder stopped the next reminder.

Not tested: the bell notification itself, and the new button in a browser.
