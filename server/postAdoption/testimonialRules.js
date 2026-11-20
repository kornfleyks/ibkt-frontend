import { TESTIMONIAL_STATUS as S, TESTIMONIAL_ACTION as A, TESTIMONIAL_MAX_LENGTH } from "../../src/constants/testimonials.js";
import { MAX_ATTEMPTS } from "../../src/constants/postAdoptionReminders.js";
import { InputError } from "../database/boardRecords.js";

// The testimonial rules, as a pure function of the stored state and the action
// asked for, so they are easy to check on their own. A state is
// { status, attempts, requestedOn, lastRequestedOn, receivedOn, text, mayPublish }
// or null when nothing was ever recorded (the same as Not requested).
//
//   request  Not requested, Declined or No response -> Requested, attempt 1
//   chase    Requested, below MAX_ATTEMPTS attempts -> one more attempt
//   receive  anything but Received, with the text -> Received
//   decline  Not requested, Requested or No response -> Declined
//   update   Received only: change the text or the permission to publish
//   reset    anything -> Not requested (the state is removed)
//
// Answers the new state, or null for reset.

export function emptyState() {
  return { status: S.NOT_REQUESTED, attempts: 0, requestedOn: null, lastRequestedOn: null, receivedOn: null, text: "", mayPublish: false };
}

function cleanText(value) {
  if (typeof value !== "string") throw new InputError("The testimonial must be text.");

  const text = value.trim();

  if (text.length > TESTIMONIAL_MAX_LENGTH) throw new InputError(`The testimonial can be at most ${TESTIMONIAL_MAX_LENGTH} characters.`);

  return text;
}

function cleanPermission(value) {
  if (typeof value !== "boolean") throw new InputError("Permission to publish must be true or false.");

  return value;
}

export function applyAction(state, action, input, today) {
  const current = { ...emptyState(), ...(state ?? {}) };

  switch (action) {
    case A.REQUEST:
      if (![S.NOT_REQUESTED, S.DECLINED, S.NO_RESPONSE].includes(current.status)) {
        throw new InputError(`A testimonial that is ${current.status} cannot be requested again.`);
      }

      return { ...current, status: S.REQUESTED, attempts: 1, requestedOn: today, lastRequestedOn: today, receivedOn: null };

    case A.CHASE:
      if (current.status !== S.REQUESTED) throw new InputError("Only a requested testimonial can be chased.");
      if (current.attempts >= MAX_ATTEMPTS) throw new InputError(`The testimonial has already been requested ${MAX_ATTEMPTS} times.`);

      return { ...current, attempts: current.attempts + 1, lastRequestedOn: today };

    case A.RECEIVE: {
      if (current.status === S.RECEIVED) throw new InputError("The testimonial is already received. Use update to change it.");

      const text = cleanText(input?.text ?? "");

      if (!text) throw new InputError("Enter the testimonial text.");

      return { ...current, status: S.RECEIVED, text, mayPublish: cleanPermission(input?.mayPublish ?? false), receivedOn: today };
    }

    case A.DECLINE:
      if (![S.NOT_REQUESTED, S.REQUESTED, S.NO_RESPONSE].includes(current.status)) {
        throw new InputError(`A testimonial that is ${current.status} cannot be marked Declined.`);
      }

      return { ...current, status: S.DECLINED };

    case A.UPDATE: {
      if (current.status !== S.RECEIVED) throw new InputError("Only a received testimonial can be edited.");

      const next = { ...current };

      if (input && Object.hasOwn(input, "text")) {
        next.text = cleanText(input.text);

        if (!next.text) throw new InputError("The testimonial text cannot be empty. Use reset to remove it.");
      }

      if (input && Object.hasOwn(input, "mayPublish")) next.mayPublish = cleanPermission(input.mayPublish);

      return next;
    }

    case A.RESET:
      return null;

    default:
      throw new InputError("Unknown testimonial action.");
  }
}
