import { ACTIVE_APPLICATIONS } from "../../../src/constants/boards/activeApplications.js";
import { toPhoneValue } from "../../phoneValue.js";
import { countryCodeOf, phoneOf } from "../preAdoptionFromJotform.js";
import { uploadUrls } from "../uploads.js";
import { ADOPTION_FORM_COLUMNS, QID } from "./questions.js";

// An "Adoption Form and References" submission as Jotform stores it
// ({ qid: { answer, ... } }) -> what to write on the applicant's application
// (docs/jotform-adoption-form-import.md). Pure: the handler reads the
// application and writes.

const A = ACTIVE_APPLICATIONS.COLUMNS;
const OTHER = "Other";
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

export const SECTION_TITLE = 'From "Adoption Form and References"';

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Summary lines are one line each, so a section ends at the first blank line.
function oneLine(value) {
  return clean(value).replace(/\s*\n\s*/g, " ");
}

function fullNameText(value) {
  return [clean(value?.first), clean(value?.middle), clean(value?.last)].filter(Boolean).join(" ");
}

function addressText(value) {
  const country = clean(value?.country);
  const place = [clean(value?.state), clean(value?.postal)].filter(Boolean).join(" ");

  return [value?.addr_line1, value?.addr_line2, value?.city, place, country].map(clean).filter(Boolean).join(", ");
}

function phoneText(value) {
  if (typeof value === "string") return clean(value);

  return clean(value?.full) || [clean(value?.area), clean(value?.phone)].filter(Boolean).join(" ");
}

// Ticked options, "Other" carrying its explanation.
function choicesText(values, otherText) {
  const picked = (Array.isArray(values) ? values : [values]).map(clean).filter(Boolean);
  const other = clean(otherText);
  const text = picked.map((option) => (option === OTHER && other ? `${OTHER}: ${other}` : option));

  if (other && !picked.includes(OTHER)) text.push(`${OTHER}: ${other}`);

  return text.join(", ");
}

// A referee as the Referee columns hold it: "Name, phone, email".
function referenceText(name, phone, email) {
  return [clean(name), phoneText(phone), clean(email)].filter(Boolean).join(", ");
}

// "Question: answer" lines, skipping empty answers.
function lines(pairs) {
  return pairs.filter(([, answer]) => oneLine(answer)).map(([question, answer]) => `${question}: ${oneLine(answer)}`);
}

// A long-text summary column with this submission's section put in (or
// replaced, on an edit, or removed when it has no lines left). Text
// outside the section - a volunteer's, or other forms' - is kept as is.
export function withSection(existing, submissionId, sectionLines) {
  const heading = `${SECTION_TITLE} (submission ${submissionId}):`;
  const kept = [];
  let skipping = false;

  for (const line of String(existing ?? "").split("\n")) {
    if (line.trim() === heading) {
      skipping = true;
      continue;
    }

    if (skipping && line.trim() === "") {
      skipping = false;
      continue;
    }

    if (!skipping) kept.push(line);
  }

  const before = kept.join("\n").trim();

  if (sectionLines.length === 0) return before;

  return [before, [heading, ...sectionLines].join("\n")].filter(Boolean).join("\n\n");
}

// Answers:
//   applicationIdHint  the hidden application id (Send Adoption Form link), or null
//   email, name        who filled it in
//   ownColumns         { columnId: value } one column per answer, Monday format
//                      (with clearEmpty, empty answers are null = clear)
//   fillIfEmpty        [{ field, columnId, value }] for application fields that
//                      only get this form's answer while they are empty
//   sections           { field: { columnId, lines } } for the summary columns
//   idDocumentUrls     the ID uploads (Jotform links)
export function toApplicationChanges(submissionAnswers, { clearEmpty = false } = {}) {
  const byQid = submissionAnswers ?? {};
  const raw = (qid) => byQid[qid]?.answer;

  const valueOf = (column) => {
    const [first, second, third] = column.qids.map(raw);

    switch (column.format) {
      case "fullName":
        return fullNameText(first);
      case "address":
        return addressText(first);
      case "phone":
        return phoneText(first);
      case "choices":
        return choicesText(first, second);
      case "nameAndPhone":
        return [fullNameText(first), phoneText(second)].filter(Boolean).join(", ");
      case "reference":
        return referenceText(first, second, third);
      case "files":
        return "";
      default:
        return Array.isArray(first) ? first.map(clean).filter(Boolean).join(", ") : clean(first);
    }
  };

  const ownColumns = {};

  for (const column of ADOPTION_FORM_COLUMNS) {
    if (column.type === "file") continue;

    const text = valueOf(column);
    const columnId = A[column.key];

    if (!text) {
      if (clearEmpty) ownColumns[columnId] = null;
      continue;
    }

    ownColumns[columnId] = column.type === "status" ? { label: text } : column.type === "long_text" ? { text } : text;
  }

  // Filled only while empty on the application (a volunteer's or the
  // Pre-Adoption Form's value wins).
  const address = raw(QID.ADDRESS) ?? {};
  const countryCode = countryCodeOf(address.country);
  const mobile = raw(QID.MOBILE_PHONE);
  const phone = toPhoneValue(phoneOf(phoneText(mobile) ? mobile : raw(QID.HOME_PHONE), countryCode));
  const fillIfEmpty = [
    { field: "phone", columnId: A.PHONE, value: !phone.error && phone.value.phone ? phone.value : undefined },
    { field: "country", columnId: A.COUNTRY, value: countryCode ? { countryCode, countryName: countryNames.of(countryCode) } : undefined },
    { field: "city", columnId: A.CITY, value: clean(address.city) || undefined },
    { field: "address", columnId: A.ADDRESS, value: addressText(address) ? { text: addressText(address) } : undefined },
    {
      field: "referee1",
      columnId: A.REFEREE_1,
      value: referenceText(raw(QID.REFERENCE_1_NAME), raw(QID.REFERENCE_1_PHONE), raw(QID.REFERENCE_1_EMAIL)) || undefined,
    },
    {
      field: "referee2",
      columnId: A.REFEREE_2,
      value: referenceText(raw(QID.REFERENCE_2_NAME), raw(QID.REFERENCE_2_PHONE), raw(QID.REFERENCE_2_EMAIL)) || undefined,
    },
  ].filter((entry) => entry.value !== undefined);

  const outdoor = [clean(raw(QID.CAT_LIVING_AREA)), clean(raw(QID.OUTDOOR_SUPERVISED)) && `supervised outdoors: ${clean(raw(QID.OUTDOOR_SUPERVISED))}`]
    .filter(Boolean)
    .join(", ");
  const rescue = [fullNameText(raw(QID.RESCUE_NAME)), phoneText(raw(QID.RESCUE_PHONE))].filter(Boolean).join(", ");

  const sections = {
    householdInformation: {
      columnId: A.HOUSEHOLD_INFORMATION,
      lines: lines([
        ["Chief responsibility", raw(QID.CHIEF_RESPONSIBILITY)],
        ["Where the cat will spend its time", outdoor],
        ["Where the cat will eat", raw(QID.WHERE_CAT_EATS)],
        ["Where the cat will sleep", raw(QID.WHERE_CAT_SLEEPS)],
        ["Home visits allowed", raw(QID.HOME_VISITS_ALLOWED)],
      ]),
    },
    existingPets: {
      columnId: A.EXISTING_PETS,
      lines: lines([
        ["Present pets vaccinated", [clean(raw(QID.PETS_VACCINATED)), oneLine(raw(QID.VACCINATION_NOTES))].filter(Boolean).join(" - ")],
        ["Current cats declawed", raw(QID.CURRENT_CATS_DECLAWED)],
      ]),
    },
    previousCatExperience: {
      columnId: A.PERVIOUS_CAT_EXPERIENCE,
      lines: lines([["Adopted before", [clean(raw(QID.ADOPTED_BEFORE)), rescue].filter(Boolean).join(" - ")]]),
    },
    workSchedule: {
      columnId: A.WORK_SCHEDULE,
      lines: lines([["Holiday plans for the pet", raw(QID.HOLIDAY_PLANS)]]),
    },
  };

  const hint = clean(String(raw(QID.APPLICATION_ID) ?? ""));

  return {
    applicationIdHint: /^\d+$/.test(hint) ? hint : null,
    email: clean(raw(QID.EMAIL)),
    name: fullNameText(raw(QID.FULL_NAME)),
    ownColumns,
    fillIfEmpty,
    sections,
    idDocumentUrls: [...uploadUrls(raw(QID.ID_UPLOAD_1)), ...uploadUrls(raw(QID.ID_UPLOAD_2))],
  };
}
