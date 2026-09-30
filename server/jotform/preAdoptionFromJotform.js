import { COUNTRIES, dialCodeOf } from "../../src/constants/countries.js";
import { PRE_ADOPTION_QUESTIONS, NOT_APPLICABLE } from "../../src/constants/forms/preAdoptionForm.js";

// A Pre-Adoption Form submission as Jotform stores it ({ qid: { type,
// answer, ... } }) -> the same answers the app's Add Application gives
// (keys of src/constants/forms/preAdoptionForm.js), so both routes share
// toApplication() and Preview (docs/jotform-pre-adoption-import.md).
// Answers { answers, photoUrls }. Question numbers the form doesn't have
// (deleted questions Jotform still sends, empty) are ignored.

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function normalize(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

// Jotform's country names that differ from the standard English ones.
const COUNTRY_ALIASES = {
  uk: "GB", greatbritain: "GB", england: "GB", scotland: "GB", wales: "GB", northernireland: "GB",
  usa: "US", us: "US", unitedstatesofamerica: "US",
  turkey: "TR", czechrepublic: "CZ", macedonia: "MK", swaziland: "SZ", ivorycoast: "CI",
  hongkong: "HK", macau: "MO", macao: "MO", palestine: "PS", myanmar: "MM", burma: "MM",
  southkorea: "KR", northkorea: "KP", russia: "RU", vatican: "VA", vaticancity: "VA",
};

const CODE_BY_NAME = new Map([
  ...COUNTRIES.map(([code]) => [normalize(regionNames.of(code)), code]),
  ...Object.entries(COUNTRY_ALIASES),
]);

// "United Kingdom" -> "GB"; "" when it isn't a known country.
export function countryCodeOf(name) {
  return CODE_BY_NAME.get(normalize(name)) ?? "";
}

// Jotform's phone ({ area, phone }, no country) -> the app's { country,
// number }: the address country, and the national number without a
// typed country code or trunk 0. Anything else is kept as typed, so it
// shows in Preview (and the Phone column stays empty - it won't convert).
export function phoneOf(raw, addressCountry) {
  const typed = [raw?.area, raw?.phone].filter(Boolean).join(" ").trim();
  let digits = typed.replace(/\D/g, "");
  const international = typed.startsWith("+") || digits.startsWith("00");
  const dialCode = dialCodeOf(addressCountry);

  if (digits.startsWith("00")) digits = digits.slice(2);

  if (international) {
    if (!dialCode || !digits.startsWith(dialCode)) return { country: addressCountry, number: typed };

    digits = digits.slice(dialCode.length);
  }

  return { country: addressCountry, number: digits.replace(/^0+/, "") || typed };
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function list(value) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);

  return text(value) ? [text(value)] : [];
}

export function fromJotform(submissionAnswers) {
  const byQid = submissionAnswers ?? {};
  const raw = (qid) => byQid[qid]?.answer;
  const answers = {};
  let photoUrls = [];

  const addressQuestion = PRE_ADOPTION_QUESTIONS.find((question) => question.type === "address");
  const address = raw(addressQuestion.qid) ?? {};
  const addressCountry = countryCodeOf(address.country);

  for (const question of PRE_ADOPTION_QUESTIONS) {
    const value = raw(question.qid);

    switch (question.type) {
      case "note":
        break;
      case "fullName":
        answers[question.key] = { first: text(value?.first), last: text(value?.last) };
        break;
      case "address":
        answers[question.key] = {
          line1: text(address.addr_line1),
          line2: text(address.addr_line2),
          city: text(address.city),
          state: text(address.state),
          postal: text(address.postal),
          country: addressCountry,
        };
        break;
      case "phone":
        answers[question.key] = phoneOf(value, addressCountry);
        break;
      case "checkbox":
        answers[question.key] = list(value);
        break;
      case "file":
        photoUrls = list(value).filter((url) => /^https:\/\//.test(url));
        break;
      default:
        if (text(value)) answers[question.key] = text(value);
    }
  }

  // The app shows Jotform's "NA" for this question as "N/A".
  if (answers.petLostBefore === "NA") answers.petLostBefore = NOT_APPLICABLE;

  return { answers, photoUrls };
}
