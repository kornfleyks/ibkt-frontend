// The Foster Application form (docs/foster-onboarding.md): the public page a
// new foster fills in, and what the server checks. It is a copy of the client's
// own IBKT Foster Compliance & Safeguarding Form (Jotform 260843004451044,
// created 2026-03-26), with the same wording, order and required fields. The
// question text below was exported from Jotform on 2026-11-17.
//
// Differences from Jotform: the full name is two questions, the address is
// several, the signature is a typed name, the declaration date is the day the
// form is sent, and only Yes can submit the commitment, responsibility and
// declaration statements (two screening questions, whether any resident pets are
// vaccinated and neutered and whether the person has had a dispute with a
// rescue, accept either answer and are shown to the reviewer).
//
// Questions use the same shape as the Pre-Adoption Form
// (constants/forms/preAdoptionForm.js), so the same question component draws
// them and the same checks run. Bump WORDING_VERSION whenever any wording below
// changes: it is saved with each application, so a later change never rewrites
// what someone agreed to.

import { questionError, isVisible } from "./preAdoptionForm.js";

export const FOSTER_FORM_ID = "foster-application";
export const WORDING_VERSION = "2026-11-17-jotform-copy-1";

const YES_NO = ["Yes", "No"];

function statement(key, label) {
  return { key, type: "radio", label, options: YES_NO, required: true, mustBeYes: true };
}

function reference(number) {
  const label = `Reference ${number}`;

  return [
    { key: `ref${number}Name`, type: "text", label: `${label} Name`, required: true },
    { key: `ref${number}Relationship`, type: "text", label: `${label} Relationship`, required: true },
    { key: `ref${number}Phone`, type: "phone", label: `${label} Phone`, required: true },
    { key: `ref${number}Email`, type: "email", label: `${label} Email`, required: true },
  ];
}

export const FOSTER_PAGES = [
  {
    title: "About you",
    questions: [
      { key: "firstName", type: "text", label: "First name", required: true },
      { key: "lastName", type: "text", label: "Last name", required: true },
      { key: "phone", type: "phone", label: "Phone Number", required: true },
      { key: "email", type: "email", label: "Email Address", required: true },
      { key: "addressLine1", type: "text", label: "Residential Address", subLabel: "Street address", required: true },
      { key: "addressLine2", type: "text", label: "Street address line 2" },
      { key: "city", type: "text", label: "City", required: true },
      { key: "region", type: "text", label: "State / Province / County" },
      { key: "postcode", type: "text", label: "Postal / Zip code", required: true },
      { key: "country", type: "text", label: "Country", required: true },
    ],
  },
  {
    title: "Foster commitment",
    questions: [
      {
        key: "commitmentNote",
        type: "note",
        label: "Section 1: Foster Commitment (Mandatory). Please answer Yes to every statement to apply. You can contact us if you have questions about any of them.",
      },
      statement("f1", "Do you agree to provide adequate food, fresh water, and a clean environment at all times?"),
      statement("f2", "Do you agree to treat the foster cat with patience, care, and positive reinforcement?"),
      statement("f3", "Do you agree to administer routine flea and worming treatment as directed by IBKT?"),
      statement("f4", "Do you agree to notify IBKT immediately if the cat becomes unwell, injured, or shows concerning behaviour?"),
      statement("f5", "Do you agree to keep the cat strictly indoors at all times unless otherwise authorised by IBKT?"),
      statement("f6", "Do you agree the cat will never be allowed to roam freely outside?"),
      statement("f7", "Do you agree to ensure all windows, balconies, and access points are secured and cat-proofed?"),
      statement("f8", "Do you understand the cat remains the property of IBKT at all times?"),
      statement("f9", "Do you agree not to transfer, rehome, or allow anyone else to care for the cat without written approval from IBKT?"),
      statement("f10", "Do you agree that all adoption enquiries must be directed to IBKT and not handled independently?"),
      statement("f11", "Do you agree to provide weekly updates (including photos/videos) on the cat in your care?"),
      statement("f12", "Do you agree to respond to IBKT communications within 24 hours?"),
      statement("f13", "Do you agree to facilitate meet and greets with potential adopters when required?"),
      statement(
        "f14",
        "Do you understand and agree that:\n- No response within 24 hours will be flagged as a concern\n- No response within 48 hours may result in escalation and welfare checks\n- No response within 72 hours may result in IBKT arranging immediate retrieval of the cat",
      ),
      statement("f15", "Do you agree not to take the cat to a vet without IBKT approval unless it is an emergency?"),
      statement("f16", "In the case of an emergency, do you agree to seek immediate care and inform IBKT as soon as possible?"),
      // A screening question: either answer can be sent, and the reviewer sees it.
      { key: "residentPets", type: "radio", label: "Do you confirm that any resident pets are vaccinated and neutered/spayed?", options: YES_NO, required: true },
      statement("f17", "Do you agree to follow IBKT guidance on introductions and isolation periods?"),
    ],
  },
  {
    title: "Responsibility",
    questions: [
      { key: "responsibilityNote", type: "note", label: "Section 2: Responsibility Acknowledgement" },
      statement("r1", "Do you understand IBKT reserves the right to remove the cat at any time if concerns arise?"),
      statement("r2", "Do you accept responsibility for any damage or incidents caused while the cat is in your care?"),
      statement("r3", "Do you agree to return the cat to IBKT if you are no longer able to foster, providing as much notice as possible (ideally 2 weeks)?"),
    ],
  },
  {
    title: "Emergency contact",
    questions: [
      { key: "emergencyNote", type: "note", label: "Section 3: Emergency Contact Details" },
      { key: "emergencyName", type: "text", label: "Full Name (Emergency Contact)", required: true },
      { key: "emergencyRelationship", type: "text", label: "Relationship to you (Emergency Contact)", required: true },
      { key: "emergencyPhone", type: "phone", label: "Phone Number (Emergency Contact)", required: true },
      { key: "emergencyEmail", type: "email", label: "Email Address (Emergency Contact)", required: true },
      { key: "emergencyAddress", type: "textarea", label: "Address (Emergency Contact)", required: true },
    ],
  },
  {
    title: "References",
    questions: [{ key: "referencesNote", type: "note", label: "Section 4: References (Minimum 3 Required)" }, ...reference(1), ...reference(2), ...reference(3)],
  },
  {
    title: "Safeguarding",
    questions: [
      { key: "safeguardingNote", type: "note", label: "Section 5: Additional Safeguarding" },
      {
        key: "disagreement",
        type: "radio",
        label: "Have you ever had a disagreement or issue with a rescue organisation or rehomed an animal independently?",
        options: YES_NO,
        required: true,
      },
      {
        key: "disagreementDetails",
        type: "textarea",
        label: "If yes, please provide details",
        required: true,
        showIf: (answers) => answers.disagreement === "Yes",
      },
    ],
  },
  {
    title: "Declaration",
    questions: [
      { key: "declarationNote", type: "note", label: "Section 6: Final Declaration" },
      statement("d1", "I confirm that all information provided is accurate and truthful."),
      statement("d2", "I understand that failure to comply with IBKT policies may result in immediate removal of the cat."),
      statement("d3", "I agree to abide by all IBKT fostering policies and instructions."),
      { key: "typedName", type: "text", label: "Full Name (Declaration)", subLabel: "Type your full name. This acts as your signature.", required: true },
    ],
  },
];

export const FOSTER_QUESTIONS = FOSTER_PAGES.flatMap((page) => page.questions);

const MAX_LENGTH = 2000;

// { key: message } for every problem with `answers`. The generic checks plus
// what is specific to this form: a required phone number needs its number,
// every statement must be answered Yes, and text is capped.
export function fosterAnswersErrors(answers) {
  const errors = {};

  for (const question of FOSTER_QUESTIONS) {
    let error = questionError(question, answers);
    const value = answers[question.key];

    if (!error && isVisible(question, answers) && question.type === "phone" && question.required && !String(value?.number ?? "").trim()) {
      error = "Enter the phone number.";
    }

    if (!error && isVisible(question, answers) && question.mustBeYes && value !== "Yes") {
      error = "You need to answer Yes to apply.";
    }

    if (!error && typeof value === "string" && value.length > MAX_LENGTH) {
      error = `Keep this under ${MAX_LENGTH} characters.`;
    }

    if (error) errors[question.key] = error;
  }

  return errors;
}

// The answers as stored: only the form's own keys, strings trimmed, and
// nothing for a question that is hidden by its condition.
export function cleanFosterAnswers(answers) {
  const clean = {};

  for (const question of FOSTER_QUESTIONS) {
    if (question.type === "note" || !isVisible(question, answers)) continue;

    const value = answers[question.key];

    if (question.type === "phone") {
      clean[question.key] = { country: String(value?.country ?? "").trim(), number: String(value?.number ?? "").trim() };
    } else if (typeof value === "string") {
      clean[question.key] = value.trim();
    }
  }

  return clean;
}
