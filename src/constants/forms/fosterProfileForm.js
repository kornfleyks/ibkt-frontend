// The Kitty Profile form of the foster portal (docs/foster-onboarding.md): what a
// foster tells IBKT about one cat. It follows the client's Jotform "Kitty Profile
// For Rehoming" form (211112902350337, exported 2026-11-17) with the same
// questions, options and order, for one cat instead of up to three, and without
// the name, the relationship to the cat and the cat's name, gender and age (the
// cat is chosen in the portal and those are already on its record). The
// unlabelled first upload question of the Jotform form is left out. The photos,
// videos, passport and vet report are sent on their own step
// (constants/fosterPortal.js), not in these answers.
//
// Questions use the same shape as the Pre-Adoption Form
// (constants/forms/preAdoptionForm.js), so the same question component draws
// them and the same checks run. Bump WORDING_VERSION whenever any wording below
// changes: it is saved with each submission.

import { questionError, isVisible } from "./preAdoptionForm.js";

export const PROFILE_FORM_ID = "foster-kitty-profile";
export const WORDING_VERSION = "2026-11-17-jotform-copy-1";

const YES_NO = ["Yes", "No"];
const BEHAVIOUR_OPTIONS = ["Friendly", "Cautious", "Fearful", "Submissive", "Tolerates", "Aggressive", "Essential", "Absolutely No", "I don't know"];

function behaviour(key, subject) {
  return {
    key,
    type: "checkbox",
    label: `How does your cat act or behave around: ${subject}`,
    subLabel: "Check all that apply.",
    options: BEHAVIOUR_OPTIONS,
    required: true,
  };
}

export const PROFILE_PAGES = [
  {
    title: "Household",
    questions: [
      { key: "howLong", type: "text", label: "How long have you had your cat or how long has it been in a foster home?", required: true },
      { key: "household", type: "select", label: "Describe the current household the cat is in", options: ["Quiet", "Active", "Noisy"], required: true },
      { key: "otherAnimals", type: "radio", label: "Are there other animals in the home?", options: YES_NO, required: true },
      {
        key: "animalTypes",
        type: "checkbox",
        label: "What types of animals has your cat been around?",
        options: ["Cats", "Dogs"],
        required: true,
        showIf: (answers) => answers.otherAnimals === "Yes",
      },
      {
        key: "otherCats",
        type: "number",
        label: "How many other cats has your cat been around?",
        required: true,
        showIf: (answers) => answers.otherAnimals === "Yes" && (answers.animalTypes ?? []).includes("Cats"),
      },
      {
        key: "otherDogs",
        type: "number",
        label: "How many dogs has your cat been around?",
        required: true,
        showIf: (answers) => answers.otherAnimals === "Yes" && (answers.animalTypes ?? []).includes("Dogs"),
      },
      behaviour("behaviourChildren", "Children"),
      behaviour("behaviourStrangers", "Strangers"),
      behaviour("behaviourCats", "Other Cats"),
      behaviour("behaviourDogs", "Dogs"),
      behaviour("behaviourIndoors", "Indoors"),
      behaviour("behaviourOutdoors", "Outdoors"),
      behaviour("behaviourNoise", "Loud Noises"),
    ],
  },
  {
    title: "Medical history",
    questions: [
      {
        key: "healthChecks",
        type: "checkbox",
        label: "Tick all that apply",
        subLabel: "If you don't know, leave blank.",
        options: ["FIV+", "FIV Negative", "FeLV+", "FELV Negative", "Rabies Vaccinated", "PCH Booster", "Dewormed", "Microchipped"],
      },
      { key: "medicalConditions", type: "textarea", label: "What medical conditions does your cat have if applicable?", required: true },
      { key: "onMedication", type: "radio", label: "Is your cat currently on any medications or special diets?", options: YES_NO, required: true },
      {
        key: "medicationDetails",
        type: "textarea",
        label: "Please list medications or special diet.",
        required: true,
        showIf: (answers) => answers.onMedication === "Yes",
      },
      {
        key: "spayedNeutered",
        type: "radio",
        label: "Is your cat spayed or neutered? (Did your cat have an operation so it can't have babies?)",
        options: ["Yes", "No", "I don't know"],
        required: true,
      },
      { key: "foodTypes", type: "checkbox", label: "What type of food does your cat eat? (Check all that apply)", options: ["Dry", "Wet", "Both"], required: true },
      { key: "feedingDetails", type: "textarea", label: "Please include some detail on feeding routine, food brands, favourite food and treats", required: true },
    ],
  },
  {
    title: "Litterbox",
    questions: [
      { key: "usesLitter", type: "radio", label: "Does your cat always use the litterbox?", options: YES_NO, required: true },
      { key: "litterType", type: "radio", label: "What type of litter does your cat use?", options: ["Clay - clumping", "Clay - non clumping", "Crystal"], required: true },
      { key: "litterBoxes", type: "radio", label: "How many litterboxes are available?", options: ["1", "2", "3", "More than 3"], required: true },
      { key: "litterBoxType", type: "radio", label: "Is the litterbox...", options: ["Open", "Covered", "Self-cleaning", "Top entry"], required: true },
      { key: "litterLocation", type: "text", label: "Where is the litterbox located in your home?", required: true },
    ],
  },
  {
    title: "Behaviour",
    questions: [
      {
        key: "personality",
        type: "checkbox",
        label: "Check all that describe your cat's personality:",
        options: ["Playful", "Couch potato", "Talkative", "Affectionate", "Destructive", "Shy", "Aggressive", "Independent"],
        required: true,
      },
      { key: "hasBitten", type: "radio", label: "Has your cat ever bitten?", options: YES_NO, required: true },
      {
        key: "biteDetails",
        type: "textarea",
        label: "Please describe the time your cat has bitten in as much detail as possible.",
        required: true,
        showIf: (answers) => answers.hasBitten === "Yes",
      },
      { key: "biteBrokeSkin", type: "radio", label: "Did the bite break skin?", options: YES_NO, required: true, showIf: (answers) => answers.hasBitten === "Yes" },
      { key: "livesWhere", type: "radio", label: "Where does your cat live?", options: ["Indoor only", "Outdoor only", "Indoor/Outdoor"], required: true },
      { key: "likesHeld", type: "radio", label: "Does your cat like to be held?", options: YES_NO, required: true },
      { key: "likesPickedUp", type: "radio", label: "Does you cat like to be picked up?", options: YES_NO, required: true },
      { key: "lapCat", type: "radio", label: "Is your cat a lap cat?", options: ["Yes, often", "Yes, sometimes", "Rarely", "Never"], required: true },
      { key: "play", type: "radio", label: "How does your cat play?", options: ["Gentle", "Somewhat rough", "Very rough", "Does not play"], required: true },
      { key: "bestQuality", type: "text", label: "What is your cat's best quality?", required: true },
      {
        key: "worstQuality",
        type: "text",
        label: "What is your cat's worst quality? Please be honest and transparent - this will help us ensure the new owner is aware",
        required: true,
      },
      { key: "otherInfo", type: "textarea", label: "Please list any other information it's important for us to know about your cat!", required: true },
    ],
  },
  {
    title: "Profile",
    questions: [
      {
        key: "profile",
        type: "textarea",
        label: "Please write a detailed profile for your cat here, including details about your cat's interactions with animals and people",
        subLabel: "Please make this as detailed as possible. The profile is used to find your cat a home.",
        required: true,
      },
      { key: "idealFamily", type: "textarea", label: "The ideal family will....", required: true },
    ],
  },
];

export const PROFILE_QUESTIONS = PROFILE_PAGES.flatMap((page) => page.questions);

const SHORT_MAX = 500;
const LONG_MAX = 4000;
const MAX_ANIMALS = 50;

// { key: message } for every problem with `answers`: the generic checks plus
// the text limits (500 for a one line answer, 4000 for a long one) and a
// sensible number of animals.
export function profileAnswersErrors(answers) {
  const errors = {};

  for (const question of PROFILE_QUESTIONS) {
    let error = questionError(question, answers);
    const value = answers[question.key];

    if (!error && isVisible(question, answers) && typeof value === "string") {
      const max = question.type === "textarea" ? LONG_MAX : SHORT_MAX;

      if (value.length > max) error = `Keep this under ${max} characters.`;
    }

    if (!error && isVisible(question, answers) && question.type === "number" && value !== undefined && value !== "" && !(Number(value) >= 0 && Number(value) <= MAX_ANIMALS)) {
      error = `Enter a number from 0 to ${MAX_ANIMALS}.`;
    }

    if (error) errors[question.key] = error;
  }

  return errors;
}

// The answers as stored: only the form's own keys, text trimmed, numbers as
// numbers, and nothing for a question hidden by its condition.
export function cleanProfileAnswers(answers) {
  const clean = {};

  for (const question of PROFILE_QUESTIONS) {
    if (!isVisible(question, answers)) continue;

    const value = answers[question.key];

    if (question.type === "checkbox") {
      clean[question.key] = Array.isArray(value) ? value.filter((option) => question.options.includes(option)) : [];
    } else if (question.type === "number") {
      if (value !== undefined && value !== "") clean[question.key] = Number(value);
    } else if (typeof value === "string") {
      clean[question.key] = value.trim();
    }
  }

  return clean;
}
