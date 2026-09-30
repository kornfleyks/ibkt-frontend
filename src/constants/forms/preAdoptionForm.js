// The client's Jotform "Pre-Adoption Form" (203096212272447), copied on
// 2026-09-30: same questions, options, required fields, pages and
// conditional logic (docs/add-application-form.md). Shared by the Add
// Application dialog (draws it) and the server (checks the answers). When
// the client edits the Jotform form, update this to match.
//
// A question: { qid, key, type, label, subLabel?, options?, required?, showIf? }
//   type: "select" | "radio" | "checkbox" (several) | "text" | "textarea" |
//         "number" | "email" | "fullName" { first, last } | "address"
//         { line1, line2, city, state, postal, country (ISO code) } |
//         "phone" { country, number } | "file" | "note" (text only)
//   showIf(answers): Jotform's show/hide conditions; a hidden question is
//         neither required nor saved.

export const PRE_ADOPTION_FORM_ID = "203096212272447";

const YES_NO = ["Yes", "No"];

export const OTHER = "Other";
export const FRIEND_RELATIVE = "Friend/Relative";
export const NOT_APPLICABLE = "N/A";
const UAE = "AE";

export const PRE_ADOPTION_PAGES = [
  {
    title: "Your interest",
    questions: [
      {
        qid: "165",
        key: "howHeard",
        type: "select",
        label: "How did you hear about us?",
        options: ["Website Enquiry", "Facebook", "Instagram", "Google", FRIEND_RELATIVE],
        required: true,
      },
      {
        qid: "189",
        key: "friendName",
        type: "text",
        label: "What is your friend/relative's name?",
        subLabel: "We like to thank our ambassadors",
        showIf: (answers) => answers.howHeard === FRIEND_RELATIVE,
      },
      {
        qid: "145",
        key: "catsInterestedIn",
        type: "textarea",
        label: "Which cat(s)/dog(s) are you interested in?",
        subLabel: "If you can provide a short description on what attracted to this particular pet, it will help your application",
        required: true,
      },
    ],
  },
  {
    title: "Your details",
    questions: [
      { qid: "119", key: "fullName", type: "fullName", label: "Your Full Name", required: true },
      // Moved up from after the phone number (Jotform's order), by request.
      { qid: "124", key: "email", type: "email", label: "E-mail", required: true },
      // Jotform requires Street Address, City and Country.
      { qid: "120", key: "address", type: "address", label: "Your Home Address", required: true },
      { qid: "25", key: "timeAtAddress", type: "text", label: "How long have you lived at this address?:", required: true },
      { qid: "121", key: "phone", type: "phone", label: "Phone Number" },
    ],
  },
  {
    title: "Your home",
    questions: [
      {
        qid: "167",
        key: "homeTenure",
        type: "select",
        label: "Select one of the following:",
        options: ["Rented", "Owned", "Living with parents", "Shared Accommodation (HMO)"],
        required: true,
      },
      {
        qid: "180",
        key: "accommodationType",
        type: "select",
        label: "Please describe your accommodation?",
        options: ["House", "Apartment", "Studio Apartment"],
        required: true,
      },
      { qid: "182", key: "privateGarden", type: "radio", label: "Does you home have access to a private garden", options: YES_NO },
      {
        qid: "152",
        key: "activityLevel",
        type: "checkbox",
        label: "What is your household activity level?",
        options: ["Quiet as a library", "Grand Central Station", "Somewhere in between", OTHER],
        required: true,
      },
      { qid: "171", key: "activityLevelOther", type: "textarea", label: "If other, please explain:" },
      {
        qid: "174",
        key: "householdMembers",
        type: "textarea",
        label: "List all people and their age (including yourself) of who will be living with the new pet",
        subLabel: "Please list names, ages, and relationships",
        required: true,
      },
      {
        qid: "91",
        key: "familyInAgreement",
        type: "radio",
        label: "Is your entire immediate family in agreement with the decision to bring a new pet into your home?",
        options: YES_NO,
        required: true,
      },
      { qid: "131", key: "familyAgreementNotes", type: "textarea", label: "If anyone is NOT, please explain:" },
    ],
  },
  {
    title: "Experience and lifestyle",
    questions: [
      {
        qid: "172",
        key: "petOwnerExperience",
        type: "checkbox",
        label: "What is your experience as a pet owner?",
        options: ["First-time owner", "Have had 1 or 2", "Knowledgeable and experienced", OTHER],
        required: true,
      },
      { qid: "173", key: "petOwnerExperienceOther", type: "textarea", label: "If other, please explain:" },
      {
        qid: "170",
        key: "adoptionReasons",
        type: "checkbox",
        label: "What is your reason for wanting to adopt a cat/dog?",
        options: ["Housepet", "Mouse Patrol", "Companion", "Companion for pet", "For the Kids", "Gift", OTHER],
        required: true,
      },
      { qid: "153", key: "adoptionReasonsOther", type: "textarea", label: "If other, please explain:" },
      {
        qid: "186",
        key: "currentPets",
        type: "textarea",
        label: "Please list all the pets currently living with you, their age, breed and how they would react to having another cat/dog:",
        subLabel: "Leave blank if not applicable",
      },
      { qid: "187", key: "currentPetsSterilised", type: "select", label: "Are your current pets sterilised?", options: ["Yes", "No", "NA"] },
      {
        qid: "135",
        key: "whyAdopt",
        type: "textarea",
        label: "Why are you choosing to adopt vs. buying from a pet store or breeder?",
        required: true,
      },
      { qid: "168", key: "hoursAlone", type: "number", label: "How many total hours will your new pet be left alone during the day?" },
      {
        qid: "51",
        key: "allergies",
        type: "radio",
        label: "Are any members of your household allergic to animals?",
        options: YES_NO,
        required: true,
      },
      { qid: "52", key: "allergyDetails", type: "textarea", label: "If yes, please describe:" },
      {
        qid: "175",
        key: "chiefCarer",
        type: "radio",
        label: "Who will have chief responsibility for the care of your new pet?",
        options: ["Myself", "My Partner", "My Parents", "My Family", OTHER],
      },
      { qid: "176", key: "chiefCarerOther", type: "textarea", label: "If other, please explain:" },
      {
        qid: "151",
        key: "petLostBefore",
        type: "radio",
        label: "Has a pet ever gone missing or been killed in a road traffic accident?",
        // "NA" on Jotform; shown as "N/A" here, by request.
        options: ["Yes", "No", NOT_APPLICABLE],
        required: true,
      },
    ],
  },
  {
    title: "Preferences",
    questions: [
      {
        qid: "69",
        key: "agePreference",
        type: "checkbox",
        label: "Age of cat /dog you would consider adopting: (check all that apply)",
        options: ["Kitten/puppy", "Young", "Adult", "Special Needs", "Senior", "Bonded pair"],
        required: true,
      },
      {
        qid: "159",
        key: "catPreferences",
        type: "checkbox",
        label: "Please select your preferences (skip this if you are looking to adopt a dog)",
        options: ["Short haired breed", "Long haired/exotic breed", "Male", "Female", "Any of the above"],
      },
      {
        qid: "93",
        key: "lifetimeCommitment",
        type: "radio",
        label: "Are you prepared to commit to a pet for 15 - 20 years (average life span)?",
        options: YES_NO,
        required: true,
      },
      {
        qid: "178",
        key: "outdoorAccess",
        type: "radio",
        label: "Will your pet be allowed outside?",
        options: [
          "Indoors only",
          "Indoor-outdoor",
          "Indoors, with some supervised time outside",
          "Indoors, with a catio so the can still experience some outdoors safely",
        ],
        required: true,
      },
      {
        qid: "177",
        key: "typicalDay",
        type: "textarea",
        label: "Tell us a little bit more about your typical day and others living with you. Additional information about current/past pets would further support your application.",
      },
      {
        qid: "200",
        key: "photos",
        type: "file",
        label: "OPTIONAL: Feel free to upload some pictures here to support you application.",
      },
      {
        qid: "112",
        key: "volunteersNote",
        type: "note",
        label: "Please remember, we are all volunteers and it may take approximately 48 hours or more for us to get back to you. Thank you so much for wanting to home a rescued cat/dog!!",
      },
      {
        qid: "192",
        key: "contactConsent",
        type: "checkbox",
        label:
          "The information you have provided on this form will be used by Itty Bitty Tails  for the purposes of facilitating your application to foster or adopt a pet. We will not use your personal information for any other purpose without prior notice to you and we will not share your personal information with third parties for their own marketing purposes. We’d love to keep you updated about our initiatives, products and ways in which you can support us to help animals. Please tell us how you would like to hear from us:",
        options: ["Email", "Phone", "Text"],
        showIf: (answers) => answers.address?.country !== UAE,
      },
    ],
  },
];

export const PRE_ADOPTION_QUESTIONS = PRE_ADOPTION_PAGES.flatMap((page) => page.questions);

// The photo upload, as in Jotform: several files, about 10 MB each.
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_EXTENSIONS = [
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "rtf", "html", "zip",
  "mp3", "wma", "mpg", "flv", "avi", "jpg", "jpeg", "png", "gif",
];

export function isVisible(question, answers) {
  return question.showIf ? question.showIf(answers) : true;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

// A question's problem with `answers`, or null. Files are checked where
// they're chosen (the dialog) - they're uploaded after the application
// exists, not sent with the answers.
export function questionError(question, answers) {
  if (!isVisible(question, answers) || question.type === "note" || question.type === "file") {
    return null;
  }

  const value = answers[question.key];

  switch (question.type) {
    case "fullName":
      return question.required && (isBlank(value?.first) || isBlank(value?.last)) ? "Enter a first and last name." : null;
    case "address":
      return question.required && (isBlank(value?.line1) || isBlank(value?.city) || isBlank(value?.country))
        ? "Enter the street address, city and country."
        : null;
    case "phone":
      return !isBlank(value?.number) && isBlank(value?.country) ? "Choose the phone number's country." : null;
    case "checkbox": {
      const picked = Array.isArray(value) ? value : [];

      if (picked.some((option) => !question.options.includes(option))) return "Choose from the list.";

      return question.required && picked.length === 0 ? "Choose at least one." : null;
    }
    case "select":
    case "radio":
      if (!isBlank(value) && !question.options.includes(value)) return "Choose from the list.";

      return question.required && isBlank(value) ? "Choose one." : null;
    case "email":
      if (question.required && isBlank(value)) return "This field is required.";

      return !isBlank(value) && !EMAIL_PATTERN.test(String(value).trim()) ? "Enter a valid email address." : null;
    case "number":
      if (question.required && isBlank(value)) return "This field is required.";

      return !isBlank(value) && !(Number(value) >= 0) ? "Enter a number." : null;
    default:
      return question.required && isBlank(value) ? "This field is required." : null;
  }
}

// { key: message } for every problem on `questions` (default: the whole form).
export function answersErrors(answers, questions = PRE_ADOPTION_QUESTIONS) {
  const errors = {};

  for (const question of questions) {
    const error = questionError(question, answers);

    if (error) errors[question.key] = error;
  }

  return errors;
}
