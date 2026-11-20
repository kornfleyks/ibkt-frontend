import { POST_ADOPTION_STATUS_OPTIONS } from "./statuses/postAdoptionStatuses.js";

// The post-adoption reminders (docs/post-adoption-reminders.md, the client
// brief: "reminder logic (3-day intervals, escalation if no response)" and
// "stop chasing after defined attempts"). A daily check tells the staff when
// a check-in is due and when to chase again, and stops after
// MAX_ATTEMPTS unanswered attempts. Staff still contact the adopter
// themselves; the app only reminds them. Shared by the server (the daily
// check) and the Post Adoption tab.

// Days between reminders, and from a chase to the next reminder.
export const REMINDER_INTERVAL_DAYS = 3;

// Unanswered attempts at one check-in before chasing stops: the check-in
// becomes No Response, Stop chasing is ticked, and Escalation Required is Yes.
export const MAX_ATTEMPTS = 3;

// Reminders to send a check-in that is due but not sent, before the Admins
// are told it is being missed.
export const MAX_SEND_REMINDERS = 3;

// The post-adoption records the check looks at (not Completed, Archived or
// Not Started).
const STATUS = POST_ADOPTION_STATUS_OPTIONS.POST_ADOPTION_STATUS;

export const OPEN_RECORD_STATUSES = [STATUS.ACTIVE, STATUS.WAITING_FOR_RESPONSE, STATUS.CONCERN];
