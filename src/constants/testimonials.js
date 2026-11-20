// Testimonial requests on a post-adoption record (docs/testimonial-requests.md,
// the client brief: "Testimonial requests" under post-adoption). Staff ask the
// adopter themselves, outside the app, and record it here. The app keeps the
// state and the testimonial text, and reminds the owner to chase. Chasing uses
// the same interval and attempt limit as the check-ins
// (src/constants/postAdoptionReminders.js). Shared by the server and the
// Post Adoption tab.

export const TESTIMONIAL_STATUS = {
  NOT_REQUESTED: "Not requested",
  REQUESTED: "Requested",
  RECEIVED: "Received",
  DECLINED: "Declined",
  NO_RESPONSE: "No response",
};

// What staff can do, in the `action` of the request.
export const TESTIMONIAL_ACTION = {
  REQUEST: "request",
  CHASE: "chase",
  RECEIVE: "receive",
  DECLINE: "decline",
  UPDATE: "update",
  RESET: "reset",
};

export const TESTIMONIAL_MAX_LENGTH = 5000;
