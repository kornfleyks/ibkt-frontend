// The client's Jotform "UAE Adoption Form & Agreement" (202981102716450),
// copied on 2026-11-11 from the form's own definition: same questions,
// order, required fields and wording, including the Terms & Conditions text
// (docs/public-forms.md). Jotform has no show/hide logic on this form, so
// every "If other / if yes" box is always shown, as there. Shared by the
// public page (draws it) and the server (checks the answers and converts
// them for the Jotform handler). When the client edits the Jotform form,
// update this to match.
//
// Question shape and types: see preAdoptionForm.js and adoptionReferencesForm.js.
// Added here: "agreement" (read-only text; `paragraphs(answers)` gives the
// paragraphs with the applicant's name and the vet cost filled in).
//
// Differences from Jotform, on purpose:
//   - the signature is a typed full name (decision 2026-11-11), not drawn
//   - the Rescuer/Owner signature, name and date are not shown (Jotform
//     hides them; a volunteer fills them in later)
//   - in the agreement a space is added where Jotform's text runs the name
//     into the next word ("{yourFull}to inform")

export const UAE_ADOPTION_FORM_ID = "202981102716450";
// The hidden question the "Send Adoption Form" link fills with the application id.
export const UAE_APPLICATION_ID_QID = "188";

const YES_NO = ["Yes", "No"];
const YES_NO_NA = ["Yes", "No", "N/A"];
const OTHER = "Other";
const REFERENCE_SUB_LABEL = "First and Last Name & Relationship to Self";

const AGREEMENT = [
  "Vet cost reimburment fee of AED{vetCosts} will be collected from the adopter at the time of adoption.",
  "{name} agrees to keep and take good care of the pet in the most possible safe and humane manner and shall treat as a family pet and companion.",
  "{name} understands that pets require to have appropriate food, water, shelter and medical care for the duration of its life and shall ensure they are properly taken care of and will nourish them to the best of their allowed capacity.",
  "{name} understands his/her responsibility to become familiar with the UAE Federal Law No. 16 of 2007 on animal welfare, and its amendments in Federal Law No. 18 of 2016 plus other laws relating to licensing and animal welfare and shall abide by them.",
  "{name} agrees to register the pet within 28 days of this agreement with the local vet.",
  "In case of incapacity to continue to care for the pet, it shall be the responsibility of {name} to inform the previous owner or the rescuer, for such incapacity, and by which the former owner or the rescuer shall have the right to exercise their retained Right of First Refusal in the opportunity to reclaim the pet. In which event {name} must transfer full ownership back to the previous owner or the rescuer mentioned in this agreement.",
  "If the pet is lost or stolen then {name} must inform the rescuer/owner immediately and ensure proper channels of reporting your pet lost or stolen are carried out. If in the event of neglect, the owner or rescuer retains the right to revoke all rights of the animal back from {name}.",
  "The parties understand that there are no guarantees or warranties concerning the behaviour, health or temperament of the pet. Any damages or injuries caused by the actions of the pet shall be borne by {name}.",
  "The parties declare that they enter into this contract voluntarily, without any hesitation or have not been induced or coerced.",
  "Should any of the provisions of this Agreement be held invalid, such invalidity shall apply only to the said invalid provision and the remaining provisions shall continue to remain valid and enforceable.",
  "No modification or alteration to any part of this contract shall be considered as having been made unless executed in writing and duly signed by the parties.",
  "If in the event the adoption is unsuccessful, 100% (one hundred percent) of the vets reimbursements costs will be non-refundable.",
  "This Agreement is subject to UAE Federal Law and the courts of United Arab Emirates shall have exclusive jurisdiction.",
];

// The agreement as the applicant reads it: Jotform fills {yourFull} with
// the name typed above and {vetCosts177} with the amount typed below.
function agreementParagraphs(answers) {
  const name = [answers.fullName?.first, answers.fullName?.last].filter((part) => String(part ?? "").trim()).join(" ") || "The Adopter";
  const vetCosts = String(answers.vetCosts ?? "").trim();

  return AGREEMENT.map((paragraph) => paragraph.replaceAll("{name}", name).replaceAll("{vetCosts}", vetCosts));
}

export const UAE_ADOPTION_FORM = {
  key: "uae-adoption-form",
  formId: UAE_ADOPTION_FORM_ID,
  applicationIdQid: UAE_APPLICATION_ID_QID,
  title: "UAE Adoption Form & Agreement",
  heading: "UAE Adoption Form & Agreement",
  submitLabel: "Submit Adoption Application",
  successMessage:
    "Thank you so much for wanting to home a rescue cat! We have received your application and will email you a confirmation within 24 hours. We are all volunteers, so it may take approximately 48 hours or more for us to get back to you.",
  pages: [
    {
      title: "About you",
      questions: [
        { qid: "119", key: "fullName", type: "fullName", label: "Your Full Name", required: true },
        { qid: "120", key: "address", type: "address", label: "Your Address", required: true },
        { qid: "25", key: "timeAtAddress", type: "text", label: "How long have you lived at this address?:", required: true },
        { qid: "121", key: "homePhone", type: "phone", label: "Home Phone Number" },
        { qid: "122", key: "cellPhone", type: "phone", label: "Cell Phone Number", required: true },
        { qid: "28", key: "employer", type: "textarea", label: "Name and Address of Employer:" },
        { qid: "123", key: "workPhone", type: "phone", label: "Work Phone Number" },
        { qid: "30", key: "latestCallTime", type: "text", label: "Up until what time of night can we contact you via phone?", required: true },
        { qid: "124", key: "email", type: "email", label: "E-mail", required: true },
        {
          qid: "169",
          key: "aboutYourself",
          type: "textarea",
          label:
            "Please tell us about yourself, your home set-up and experience with pets (past and current) and why you feel you would be suitable for adoption. Any submissions without this detail will not be considered. Please be as detailed as possible.",
          required: true,
        },
        { qid: "166", key: "emiratesIdFront", type: "file", label: "Upload the FRONT of your Emirates ID", required: true },
        { qid: "167", key: "emiratesIdBack", type: "file", label: "Upload the BACK of your Emirates ID", required: true },
      ],
    },
    {
      title: "Your home",
      questions: [
        { qid: "36", key: "vetFeesReimbursement", type: "radio", label: "Do you agree to pay a reimbursement on vets fees?", options: YES_NO, required: true },
        {
          qid: "43",
          key: "dwellingType",
          type: "select",
          label: "Type of Dwelling:",
          options: ["House", "Apartment", "Condo", "Mobile Home"],
          required: true,
        },
        { qid: "160", key: "ownsHome", type: "radio", label: "Do you own your home?", options: YES_NO },
        { qid: "161", key: "gardenBalcony", type: "radio", label: "Do you have a garden/balcony?", options: ["Garden", "Balcony", "Both"] },
        {
          qid: "162",
          key: "outdoorPlans",
          type: "textarea",
          label: "If yes, do you plan on letting your cat out on to the balcony or outdoors?",
          subLabel: "Please explain in full what precautions you’ll take to secure the balcony.",
        },
        { qid: "38", key: "movingSoon", type: "radio", label: "Are you planning on moving within the next 12 months?", options: YES_NO, required: true },
        { qid: "39", key: "movingPlans", type: "textarea", label: "If yes, what are your plans for your pets if you move?" },
        {
          qid: "163",
          key: "leavingUaePlans",
          type: "textarea",
          label: "UAE isn’t forever for expats, we all have to leave one day. What are your plans for your pets when you leave?",
          required: true,
        },
        { qid: "125", key: "birthDate", type: "date", label: "Birth Date", required: true },
        { qid: "49", key: "householdMembers", type: "textarea", label: "Name and age of ALL occupants in household (including yourself):", required: true },
        {
          qid: "50",
          key: "childrenPlans",
          type: "radio",
          label: "If no children, do you plan on having children or will children be visiting the household frequently?",
          options: YES_NO,
          required: true,
        },
      ],
    },
    {
      title: "Pets and care",
      questions: [
        {
          qid: "152",
          key: "adoptionReasons",
          type: "checkbox",
          label: "What is your reason for wanting to adopt a cat?",
          options: ["Housepet", "Mouse Patrol", "Companion", "Companion for pet", "Gift", OTHER],
          required: true,
        },
        { qid: "153", key: "adoptionReasonsOther", type: "textarea", label: "If other, please explain:" },
        { qid: "117", key: "hoursAlone", type: "textarea", label: "How many total hours will your new pet be left alone during the day?", required: true },
        { qid: "146", key: "kittenAlone", type: "textarea", label: "If adopting a kitten, where would the kitten be kept when alone?" },
        {
          qid: "147",
          key: "plansToDeclaw",
          type: "radio",
          label: "Are you planning on declawing your new cat or kitten?",
          options: ["Yes", "No", "Maybe"],
          required: true,
        },
        { qid: "148", key: "currentCatsDeclawed", type: "radio", label: "Are your current cats declawed?", options: YES_NO_NA, required: true },
        { qid: "51", key: "allergies", type: "radio", label: "Are any members of your household allergic to animals?", options: YES_NO, required: true },
        { qid: "52", key: "allergyDetails", type: "textarea", label: "If yes, please describe:" },
        { qid: "126", key: "chiefResponsibility", type: "textarea", label: "Who will have chief legal responsibility for the care of your new pet?", required: true },
        {
          qid: "54",
          key: "petsOwned5Years",
          type: "select",
          label: "Over the past 5 years, how many pets have you owned? (Include current pets)",
          options: ["0", "1", "2", "3", "4", "5", "6+"],
          required: true,
        },
        { qid: "55", key: "petsList", type: "textarea", label: "List each individually including breed, age, still living with you? (if not, why?)" },
        { qid: "56", key: "spouseCat", type: "radio", label: "Have you and your spouse (if applicable) ever owned a cat together?", options: YES_NO_NA, required: true },
        { qid: "115", key: "spouseCatWhen", type: "textarea", label: "If yes, when?" },
        { qid: "151", key: "petLostOrGiven", type: "radio", label: "Have you ever lost or given away a pet?", options: YES_NO, required: true },
        { qid: "58", key: "petsReaction", type: "textarea", label: "If you currently own a dog or cat, how does he/she react to new cats?" },
        {
          qid: "59",
          key: "petsVaccinated",
          type: "radio",
          label: "Are your present pets up-to-date on their annual vaccines?",
          options: YES_NO_NA,
          required: true,
        },
        { qid: "60", key: "vaccinationNotes", type: "textarea", label: "If no, please explain:" },
        { qid: "61", key: "presentPetsNeutered", type: "radio", label: "Are your present pets spayed or neutered?", options: YES_NO_NA, required: true },
        { qid: "62", key: "presentPetsNeuteredNotes", type: "textarea", label: "If no, please explain." },
        { qid: "63", key: "previousPetsNeutered", type: "radio", label: "Were your previous pets spayed or neutered?", options: YES_NO_NA, required: true },
        { qid: "64", key: "previousPetsNeuteredNotes", type: "textarea", label: "If no, please explain." },
        {
          qid: "127",
          key: "medicalBudget",
          type: "textarea",
          label: "How much are you financially prepared to spend for routine/emergency medical care, licensing, etc?",
          required: true,
        },
        { qid: "66", key: "holidayPlans", type: "textarea", label: "What plans do you have for your new pet when you are on vacation?", required: true },
        { qid: "145", key: "catsInterestedIn", type: "textarea", label: "Which cat(s) are you interested in?", required: true },
        {
          qid: "69",
          key: "agePreference",
          type: "checkbox",
          label: "Age of cat you would consider adopting: (check all that apply)",
          options: ["Kitten", "Young", "Adult", "Special Needs", "Senior"],
          required: true,
        },
        {
          qid: "159",
          key: "catPreferences",
          type: "checkbox",
          label: "Please select your preferences:",
          options: ["Short haired breed", "Long haired/exotic breed", "Male", "Female", "Any of the above"],
        },
        { qid: "75", key: "fleaPrevention", type: "radio", label: "Can/Will you provide your cat with monthly flea/tick prevention?", options: YES_NO, required: true },
        { qid: "164", key: "relocationBudget", type: "text", label: "How much are you prepared to spend on relocating your cat(s) with you when you leave?" },
        {
          qid: "128",
          key: "veterinarian",
          type: "textarea",
          label:
            "Who is your current or most recent veterinarian? Please provide their NAME and PHONE NUMBER: PLEASE MAKE SURE YOU CALL YOUR VET TO GIVE PERMISSION TO RELEASE INFORMATION AS MANY WILL NOT GIVE US A REFERENCE W/OUT YOUR CALL, AND WE WILL NOT BE ABLE TO PROCESS YOUR APPLICATION.",
          required: true,
        },
        {
          qid: "149",
          key: "behaviourFix",
          type: "checkbox",
          label: "If your cat displays behavioral problems (such as poor litter box habits, inappropriate scratching etc.) how would you go about correcting the behavior?",
          options: ["Contact a Professional", "Use a book", "Personal Knowledge", OTHER],
          required: true,
        },
        { qid: "154", key: "behaviourFixOther", type: "textarea", label: "If other, please explain:" },
        {
          qid: "150",
          key: "housebreakingFix",
          type: "checkbox",
          label: "What type of solution would you be willing to try if housebreaking accidents continue after the first week (check all that apply)?",
          options: ["Move box to new location", "Try a different litter", "Clean box more often", "Have cat examined by vet", "Use a cat door", "Return Cat", "None", OTHER],
          required: true,
        },
        { qid: "155", key: "housebreakingFixOther", type: "textarea", label: "If other, please explain:" },
        { qid: "129", key: "catFood", type: "textarea", label: "What brand of cat food do you plan on feeding your new cat?", required: true },
      ],
    },
    {
      title: "Commitment and history",
      questions: [
        {
          qid: "91",
          key: "familyInAgreement",
          type: "radio",
          label: "Is your entire immediate family in agreement with the decision to bring a new pet into your home?",
          options: YES_NO,
          required: true,
        },
        { qid: "131", key: "familyAgreementNotes", type: "textarea", label: "If anyone is NOT, please explain:" },
        {
          qid: "93",
          key: "lifetimeCommitment",
          type: "radio",
          label: "Are you prepared to commit to a pet for 15 - 20 years (average life span)?",
          options: YES_NO,
          required: true,
        },
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
        { qid: "135", key: "whyAdopt", type: "textarea", label: "Why are you choosing to adopt vs. buying from a pet store or breeder?", required: true },
        { qid: "136", key: "whyAdoptOther", type: "textarea", label: "If other, please explain:" },
        {
          qid: "100",
          key: "catLivingArea",
          type: "select",
          label: "Where will your cat spend most of his/her time?",
          options: ["Indoors Only", "Outdoors Only", "Indoors and Outdoors", "Barn Cat", "Basement/Garage", "Confined"],
          required: true,
        },
        { qid: "156", key: "outdoorSupervised", type: "radio", label: "If you selected outdoor, would your cat be supervised?", options: YES_NO },
        { qid: "138", key: "whereCatEats", type: "textarea", label: "Where will your cat eat?", required: true },
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
        { qid: "107", key: "reference1", type: "text", label: "Reference #1", subLabel: REFERENCE_SUB_LABEL, required: true },
        { qid: "140", key: "reference1Phone", type: "phone", label: "Reference # 1 Phone Number", required: true },
        { qid: "108", key: "reference2", type: "text", label: "Reference #2", subLabel: REFERENCE_SUB_LABEL, required: true },
        { qid: "141", key: "reference2Phone", type: "phone", label: "Reference #2 Phone Number", required: true },
        { qid: "109", key: "reference3", type: "text", label: "Reference #3", subLabel: REFERENCE_SUB_LABEL, required: true },
        { qid: "142", key: "reference3Phone", type: "phone", label: "Reference #3 Phone Number", required: true },
        { qid: "143", key: "anythingElse", type: "textarea", label: "If there is anything else you think we should know, please note it here." },
      ],
    },
    {
      title: "Terms & Conditions",
      questions: [
        { qid: "177", key: "vetCosts", type: "text", label: "Vet Costs Reimbursments (AED)" },
        { key: "agreement", type: "agreement", label: "Terms & Conditions", paragraphs: agreementParagraphs },
        {
          qid: "178",
          key: "adopterSignature",
          type: "text",
          jotformType: "control_signature",
          label: "Signature of Adopter",
          subLabel: "Type your full name. It is your signature.",
        },
        { qid: "179", key: "adopterName", type: "text", label: "Type Name of Adopter" },
        { qid: "181", key: "adopterSignedOn", type: "date", label: "Date" },
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
