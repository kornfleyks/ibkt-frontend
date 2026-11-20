// The Rescuer Application form (docs/rescuer-onboarding.md): the public page
// a new rescuer fills in, and what the server checks. The wording is a
// DRAFT written by us (no rescuer agreement existed) and must be approved by
// the client before go-live. Questions use the same shape as the Pre-Adoption
// Form (constants/forms/preAdoptionForm.js), so the same question component
// draws them and the same checks run.
//
// Bump WORDING_VERSION whenever any wording below changes: it is saved with
// each application, so a later change never rewrites what someone agreed to.

import { questionError } from "./preAdoptionForm.js";

export const RESCUER_FORM_ID = "rescuer-application";
export const WORDING_VERSION = "2026-10-16-draft-1";

const YES_NO = ["Yes", "No"];

export const CONTACT_METHODS = ["Email", "WhatsApp", "Phone"];

function agreement(key, label) {
  return { key, type: "radio", label, options: YES_NO, required: true, mustBeYes: true };
}

export const RESCUER_PAGES = [
  {
    title: "About you",
    questions: [
      { key: "firstName", type: "text", label: "First name", required: true },
      { key: "lastName", type: "text", label: "Last name", required: true },
      { key: "email", type: "email", label: "Email", required: true },
      { key: "phone", type: "phone", label: "Phone", required: true },
      { key: "whatsapp", type: "text", label: "WhatsApp number", subLabel: "Leave blank if it is the same as your phone number" },
      { key: "country", type: "text", label: "Country", required: true },
      { key: "city", type: "text", label: "City", required: true },
      { key: "contactMethod", type: "select", label: "Preferred contact method", options: CONTACT_METHODS, required: true },
    ],
  },
  {
    title: "Your rescue work",
    questions: [
      {
        key: "catsDescription",
        type: "textarea",
        label: "Tell us about the cats you rescue and want to rehome",
        subLabel: "Roughly how many, and where they come from",
        required: true,
      },
      {
        key: "groupName",
        type: "text",
        label: "If you work with a group or organisation, what is its name?",
        subLabel: "Leave blank if you work on your own",
      },
      { key: "howHeard", type: "text", label: "How did you hear about Itty Bitty Kitty Tails?" },
      { key: "notes", type: "textarea", label: "Anything else we should know?" },
    ],
  },
  {
    title: "Agreement",
    questions: [
      { key: "agreementNote", type: "note", label: "Please answer Yes to every statement to apply. You can contact us if you have questions about any of them." },
      agreement("a1", "I will give IBKT accurate and complete information about every cat I submit."),
      agreement("a2", "I understand that IBKT decides which cats are listed and when, and that a listing is not a guarantee of adoption."),
      agreement("a3", "I will direct all adoption enquiries for cats I submit to IBKT and will not rehome them privately."),
      agreement("a4", "I will respond to IBKT messages within 48 hours."),
      agreement("a5", "I will tell IBKT promptly if a cat's health, location or circumstances change."),
      agreement("a6", "I will tell IBKT if I can no longer care for a cat so a plan can be made together."),
      agreement("vetPermission", "I give IBKT permission to arrange veterinary care for the cats I submit if needed."),
      agreement("mediaUsage", "I give IBKT permission to use photos and videos of the cats I submit on its website and social media."),
      agreement(
        "medicalDisclosure",
        "I will share everything I know about each cat's health, and I accept responsibility for the accuracy of that information.",
      ),
      agreement(
        "financialResponsibility",
        "I understand that costs for a cat are agreed with IBKT before they are incurred, and that IBKT will not reimburse costs unless it has agreed to them in advance.",
      ),
    ],
  },
  {
    title: "Declaration",
    questions: [
      agreement("declaration", "I confirm that all the information I have given is accurate and truthful."),
      { key: "typedName", type: "text", label: "Type your full name", subLabel: "This acts as your signature", required: true },
    ],
  },
];

export const RESCUER_QUESTIONS = RESCUER_PAGES.flatMap((page) => page.questions);

// The statements that map to a Rescuers board consent column, and the ones
// that together make "Rescuer Agreement Signed".
export const AGREEMENT_KEYS = ["a1", "a2", "a3", "a4", "a5", "a6"];
export const CONSENT_KEYS = ["vetPermission", "mediaUsage", "medicalDisclosure", "financialResponsibility"];

const MAX_LENGTH = 2000;

// { key: message } for every problem with `answers`. The generic checks
// plus what is specific to this form: a phone number is required, every
// statement must be answered Yes, and text is capped.
export function rescuerAnswersErrors(answers) {
  const errors = {};

  for (const question of RESCUER_QUESTIONS) {
    let error = questionError(question, answers);
    const value = answers[question.key];

    if (!error && question.type === "phone" && question.required && !String(value?.number ?? "").trim()) {
      error = "Enter your phone number.";
    }

    if (!error && question.mustBeYes && value !== "Yes") {
      error = "You need to answer Yes to apply.";
    }

    if (!error && typeof value === "string" && value.length > MAX_LENGTH) {
      error = `Keep this under ${MAX_LENGTH} characters.`;
    }

    if (error) errors[question.key] = error;
  }

  return errors;
}

// The answers as stored: only the form's own keys, strings trimmed.
export function cleanRescuerAnswers(answers) {
  const clean = {};

  for (const question of RESCUER_QUESTIONS) {
    if (question.type === "note") continue;

    const value = answers[question.key];

    if (question.type === "phone") {
      clean[question.key] = { country: String(value?.country ?? "").trim(), number: String(value?.number ?? "").trim() };
    } else if (typeof value === "string") {
      clean[question.key] = value.trim();
    }
  }

  return clean;
}
