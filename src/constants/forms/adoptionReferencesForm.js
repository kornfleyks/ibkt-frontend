// The client's Jotform "Adoption Form and References" (211304838746458), the
// UK and US second-stage form, copied on 2026-11-11 from the form's own
// definition: same questions, order, required fields and wording. Jotform has
// no show/hide logic on this form, so every "If other / if yes" box is always
// shown, as there. Shared by the public page (draws it) and the server
// (checks the answers and converts them for the Jotform handler,
// docs/public-forms.md). When the client edits the Jotform form, update this
// to match.
//
// Question shape and types: see preAdoptionForm.js. Added here:
//   labels   { first, last } the two box labels of a "fullName" question
//   foldInto a question without a Jotform id whose text is added to the
//            "Other" option of another question (Jotform's "Other" box)

export const ADOPTION_REFERENCES_FORM_ID = "211304838746458";
// The hidden question the "Send Adoption Form" link fills with the application id.
export const ADOPTION_REFERENCES_APPLICATION_ID_QID = "174";

const YES_NO = ["Yes", "No"];
const YES_NO_NA = ["Yes", "No", "N/A"];
const OTHER = "Other";
const PLACES = ["Indoors Only", "Outdoors Only", "Indoors and Outdoors", "Barn Cat", "Basement/Garage", "Confined"];
const BEHAVIOUR_FIXES = ["Contact a Professional", "Use a book", "Personal Knowledge", OTHER];
const HOUSEBREAKING_FIXES = [
  "Move box to new location",
  "Try a different litter",
  "Clean box more often",
  "Have cat examined by vet",
  "Use a cat door",
  "Return Cat",
  "None",
  OTHER,
];
const REFERENCE_SUB_LABEL = "First and Last Name & Relationship to Self";

export const ADOPTION_REFERENCES_FORM = {
  key: "adoption-form",
  formId: ADOPTION_REFERENCES_FORM_ID,
  applicationIdQid: ADOPTION_REFERENCES_APPLICATION_ID_QID,
  title: "Adoption Form and References",
  heading: "Adoption Form and References",
  submitLabel: "Submit Adoption Application",
  successMessage:
    "Thank you so much for wanting to rehome a rescue cat! We have received your application. We are all volunteers, so it may take approximately 48 hours or more for us to get back to you.",
  pages: [
    {
      title: "About you",
      questions: [
        { qid: "166", key: "whichCat", type: "text", label: "Which cat are your applying for?" },
        { qid: "119", key: "fullName", type: "fullName", label: "Your Full Name", required: true },
        { qid: "120", key: "address", type: "address", label: "Your Home Address", required: true },
        { qid: "25", key: "timeAtAddress", type: "text", label: "How long have you lived at this address?:", required: true },
        { qid: "121", key: "homePhone", type: "phone", label: "Home Phone Number" },
        { qid: "122", key: "mobilePhone", type: "phone", label: "Mobile Number" },
        { qid: "28", key: "employer", type: "textarea", label: "Name and Address of Employer:" },
        { qid: "123", key: "workPhone", type: "phone", label: "Work Phone Number" },
        { qid: "30", key: "latestCallTime", type: "text", label: "Up until what time of night can we contact you via phone?", required: true },
        { qid: "124", key: "email", type: "email", label: "E-mail", required: true },
        { qid: "169", key: "idUpload1", type: "file", label: "Please upload ID" },
        { qid: "170", key: "idUpload2", type: "file", label: "Please upload ID" },
        {
          qid: "158",
          key: "nearestAirports",
          type: "checkbox",
          label: "Please select your two nearest airports (only applicable if you are adopting from overseas)",
          options: ["London Heathrow", "London Gatwick", "Manchester", "Edinburgh", "Glasgow", "Paris", "Amsterdam", "Frankfurt", OTHER],
        },
        {
          key: "nearestAirportsOther",
          type: "text",
          label: "Other airport:",
          foldInto: "nearestAirports",
          showIf: (answers) => (answers.nearestAirports ?? []).includes(OTHER),
        },
      ],
    },
    {
      title: "Pet care",
      questions: [
        { qid: "36", key: "canAffordFee", type: "radio", label: "Are you able to afford the advertised adoption fee?", options: YES_NO, required: true },
        {
          qid: "147",
          key: "plansToDeclaw",
          type: "radio",
          label: "Are you planning on declawing your new cat or kitten?",
          options: ["Yes", "No", "Maybe"],
          required: true,
        },
        { qid: "148", key: "currentCatsDeclawed", type: "radio", label: "Are your current cats declawed?", options: YES_NO_NA, required: true },
        { qid: "126", key: "chiefResponsibility", type: "textarea", label: "Who will have chief responsibility for the care of your new pet?", required: true },
        {
          qid: "59",
          key: "petsVaccinated",
          type: "radio",
          label: "Are your present pets up-to-date on their annual vaccines?",
          options: YES_NO_NA,
          required: true,
        },
        { qid: "60", key: "vaccinationNotes", type: "textarea", label: "If no, please explain:" },
        {
          qid: "127",
          key: "medicalBudget",
          type: "textarea",
          label: "How much are you financially prepared to spend for routine/emergency medical care, licensing, etc?",
          required: true,
        },
        { qid: "66", key: "holidayPlans", type: "textarea", label: "What plans do you have for your new pet when you are on vacation?", required: true },
        { qid: "75", key: "fleaPrevention", type: "radio", label: "Can/Will you provide your cat with monthly flea/tick prevention?", options: YES_NO, required: true },
        {
          qid: "128",
          key: "veterinarian",
          type: "textarea",
          label:
            "Who is your current or most recent veterinarian? Please provide their NAME and PHONE NUMBER: PLEASE MAKE SURE YOU CALL YOUR VET TO GIVE PERMISSION TO RELEASE INFORMATION AS MANY WILL NOT GIVE US A REFERENCE W/OUT YOUR CALL, AND WE WILL NOT BE ABLE TO PROCESS YOUR APPLICATION.",
          subLabel: "If you are a first time pet owner, please type NA",
          required: true,
        },
        {
          qid: "149",
          key: "behaviourFix",
          type: "checkbox",
          label: "If your cat displays behavioral problems (such as poor litter box habits, inappropriate scratching etc.) how would you go about correcting the behavior?",
          options: BEHAVIOUR_FIXES,
          required: true,
        },
        { qid: "154", key: "behaviourFixOther", type: "textarea", label: "If other, please explain:" },
        {
          qid: "150",
          key: "housebreakingFix",
          type: "checkbox",
          label: "What type of solution would you be willing to try if housebreaking accidents continue after the first week (check all that apply)?",
          options: HOUSEBREAKING_FIXES,
          required: true,
        },
        { qid: "155", key: "housebreakingFixOther", type: "textarea", label: "If other, please explain:" },
        { qid: "129", key: "catFood", type: "textarea", label: "What brand of cat food do you plan on feeding your new cat?", required: true },
      ],
    },
    {
      title: "Home and history",
      questions: [
        {
          qid: "94",
          key: "homeVisits",
          type: "radio",
          label: "Are you willing to allow one of our local representatives to make future visits to your home?",
          options: YES_NO,
          required: true,
        },
        {
          qid: "95",
          key: "crueltyCharge",
          type: "radio",
          label: "Have you or any member of your household ever been charged with cruelty to animals or negligence in animal care?",
          options: YES_NO,
          required: true,
        },
        { qid: "132", key: "crueltyDetails", type: "textarea", label: "If yes, please describe:" },
        {
          qid: "97",
          key: "adoptedBefore",
          type: "radio",
          label: "Have you ever adopted or tried to adopt a pet before? If yes, fill out info below.",
          options: YES_NO,
          required: true,
        },
        { qid: "133", key: "rescueInfo", type: "fullName", label: "Rescue Information", labels: { first: "Name of Rescue", last: "Contact Name" } },
        { qid: "134", key: "rescuePhone", type: "phone", label: "Rescue's Phone Number" },
        { qid: "100", key: "catLivingArea", type: "select", label: "Where will your cat spend most of his/her time?", options: PLACES, required: true },
        { qid: "156", key: "outdoorSupervised", type: "radio", label: "If you selected outdoor, would your cat be supervised?", options: YES_NO },
        { qid: "138", key: "whereCatEats", type: "textarea", label: "Where will your cat eat?" },
        { qid: "139", key: "whereCatSleeps", type: "textarea", label: "Where will your cat sleep?", required: true },
      ],
    },
    {
      title: "References",
      questions: [
        {
          qid: "106",
          key: "referencesNote",
          type: "note",
          label:
            "Please provide 3 personal references (only 1 can be a relative) that can testify to your responsibility and ability to care for your animals. This is required or your application cannot be approved. PLEASE BE AWARE: If your references are not easily reachable or do not reply in a timely manner, it will delay your application. If multiple references do not reply, your application will be filed on HOLD. Please choose your references carefully and be sure to list the correct contact numbers.",
        },
        { qid: "107", key: "reference1", type: "text", label: "Reference #1", subLabel: REFERENCE_SUB_LABEL },
        { qid: "140", key: "reference1Phone", type: "phone", label: "Reference # 1 Phone Number" },
        { qid: "171", key: "reference1Email", type: "email", label: "Reference #1 Email Address", required: true },
        { qid: "108", key: "reference2", type: "text", label: "Reference #2", subLabel: REFERENCE_SUB_LABEL },
        { qid: "141", key: "reference2Phone", type: "phone", label: "Reference #2 Phone Number" },
        { qid: "172", key: "reference2Email", type: "email", label: "Reference #2 Email" },
        { qid: "109", key: "reference3", type: "text", label: "Reference #3", subLabel: REFERENCE_SUB_LABEL },
        { qid: "142", key: "reference3Phone", type: "phone", label: "Reference # 3 Phone Number" },
        { qid: "173", key: "reference3Email", type: "email", label: "Reference #3 Email" },
        { qid: "143", key: "anythingElse", type: "textarea", label: "If there is anything else you think we should know, please note it here." },
        {
          qid: "112",
          key: "volunteersNote",
          type: "note",
          label: "Please remember, we are all volunteers and it may take approximately 48 hours or more for us to get back to you.",
        },
      ],
    },
  ],
};
