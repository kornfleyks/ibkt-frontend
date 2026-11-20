// The client's Jotform "Reference Check - IBKT" (220642582493458), copied on
// 2026-11-11 from the form's own definition: same questions, order,
// required fields and wording. A referee fills it in about an applicant
// (docs/public-forms.md). Shared by the public page (draws it) and the
// server (checks the answers and converts them for the Jotform handler).
// When the client edits the Jotform form, update this to match.
//
// Question shape and types: see preAdoptionForm.js. Added here: "date" (a
// YYYY-MM-DD string). The signature is a typed full name (decision
// 2026-11-11), so it is a "text" question.

export const REFERENCE_CHECK_FORM_ID = "220642582493458";

const YES_NO = ["Yes", "No"];

export const REFERENCE_CHECK_FORM = {
  key: "reference-check",
  formId: REFERENCE_CHECK_FORM_ID,
  title: "Reference Check",
  heading: "Character Reference for Pet Adoption/Foster",
  intro:
    "Please complete all the questions in full and honestly. Any delays in submitting this form will delay the applicants adoption process, for any queries you can reach us on Support@ittybittykittytails.co.uk",
  submitLabel: "Submit",
  successMessage: "Thank you. Your reference has been sent to Itty Bitty Kitty Tails.",
  pages: [
    {
      title: "About you",
      questions: [
        { qid: "4", key: "candidateName", type: "fullName", label: "Candidate's Name", required: true },
        { qid: "5", key: "refereeName", type: "fullName", label: "Your Name", required: true },
        { qid: "6", key: "refereePhone", type: "phone", label: "Your Phone Number", required: true },
        { qid: "16", key: "refereeEmail", type: "email", label: "Your Email Address", required: true },
        {
          qid: "7",
          key: "howLongKnown",
          type: "text",
          label: "How long have you known the applicant and in what capacity (personal/professional)?",
          required: true,
        },
      ],
    },
    {
      title: "The applicant",
      questions: [
        {
          qid: "9",
          key: "responsible",
          type: "textarea",
          label: "Would you consider the applicant to be a responsible person? Please give a reason to support your answer",
          required: true,
        },
        {
          qid: "20",
          key: "financiallyEquipped",
          type: "textarea",
          label: "From what you know (not a typical topic of conversation) are they financially equipped to care for a cat?",
          required: true,
        },
        {
          qid: "21",
          key: "interactionWithAnimals",
          type: "textarea",
          label: "Have you seen the applicant interacting with animals? How would you describe that interaction?",
          required: true,
        },
        {
          qid: "22",
          key: "currentPets",
          type: "textarea",
          label: "Do they currently have pets? Have they had pets before? Do you know where those pets are now?",
        },
        {
          qid: "23",
          key: "petTreatment",
          type: "textarea",
          label: "If so, how are/were the pets treated at home? (e.g. working animals, family members, therapy, etc.)",
        },
        {
          qid: "24",
          key: "healthIssues",
          type: "textarea",
          label: "Are you aware of any health issues which could impact their ability to look after a pet?",
          required: true,
        },
        { qid: "31", key: "travel", type: "text", label: "Does the applicant travel often?", subLabel: "If yes, please detail the frequency of travel" },
        {
          qid: "25",
          key: "homeAndRoutine",
          type: "textarea",
          label: "From what you know, could you describe the applicants home, routine and how many hours they are likely to be out the house per day?",
          required: true,
        },
        { qid: "26", key: "opinion", type: "textarea", label: "What's your opinion of the applicant as a pet owner/foster?", required: true },
        {
          qid: "27",
          key: "notRightTime",
          type: "textarea",
          label: "Any reason why now wouldn't be the right time for the applicant to adopt/foster a pet?",
          required: true,
        },
        { qid: "10", key: "criminalHistory", type: "radio", label: "Are you aware of any criminal history of the applicant?", options: YES_NO, required: true },
        {
          qid: "11",
          key: "otherFactors",
          type: "textarea",
          label: "Are there any other factors that we should know about in making a decision to approve the application to Adopt a pet?",
        },
      ],
    },
    {
      title: "Declaration",
      questions: [
        {
          qid: "29",
          key: "contactConsent",
          type: "radio",
          label:
            "The information you have provided on this form will be used by Itty Bitty Kitty Tails for the purposes of facilitating the application to foster or adopt a pet. We will not use your personal information for any other purpose without prior notice and we will not share your personal information with third parties for their own marketing purposes. Can we contact you should we have any further questions?",
          options: YES_NO,
          required: true,
        },
        {
          qid: "14",
          key: "signature",
          type: "text",
          jotformType: "control_signature",
          label: "Your Signature",
          subLabel: "Type your full name. It is your signature.",
          required: true,
        },
        { qid: "13", key: "signedOn", type: "date", label: "Today's Date", required: true },
      ],
    },
  ],
};
