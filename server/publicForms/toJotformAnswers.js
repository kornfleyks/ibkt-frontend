import { dialCodeOf } from "../../src/constants/countries.js";
import { isVisible } from "../../src/constants/forms/preAdoptionForm.js";

// A public form's answers (src/constants/forms/publicForms.js, keyed by the
// question's `key`) -> a Jotform submission's answers ({ qid: { name, type,
// text, order, answer } }), the shape the handlers in server/jotform read
// (docs/public-forms.md). That way a submission made in the app and one made
// on Jotform are applied by the same code and give the same result.
//
// Only visible questions with an answer are included. Notes, agreement text
// and the questions without a Jotform id are not (a `foldInto` question's text
// is added to the "Other" option of the question it names).

const OTHER = "Other";
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

const text = (value) => (typeof value === "string" ? value.trim() : "");

// "AE" -> "United Arab Emirates"; "" when unknown. The handlers turn the name
// back into a code (jotform/preAdoptionFromJotform.js countryCodeOf).
function countryName(code) {
  try {
    return code ? regionNames.of(code) : "";
  } catch {
    return "";
  }
}

// { country: "GB", number: "7700 900123" } -> { phone: "+447700900123" }, the
// whole international number in the number part (as the Send Adoption Form
// link does). Nothing when no number was typed.
function phoneAnswer(value) {
  const digits = text(value?.number).replace(/\D/g, "").replace(/^0+/, "");
  const dialCode = dialCodeOf(value?.country);

  if (!digits) return null;

  return { phone: dialCode ? `+${dialCode}${digits}` : text(value.number) };
}

// "2026-11-11" -> { year: "2026", month: "11", day: "11" }
function dateAnswer(value) {
  const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value)) ?? [];

  return year ? { year, month, day } : null;
}

function answerOf(question, value) {
  switch (question.type) {
    case "fullName":
      return text(value?.first) || text(value?.last) ? { first: text(value.first), last: text(value.last) } : null;
    case "address":
      return text(value?.line1) || text(value?.city)
        ? {
            addr_line1: text(value.line1),
            addr_line2: text(value.line2),
            city: text(value.city),
            state: text(value.state),
            postal: text(value.postal),
            country: countryName(value.country),
          }
        : null;
    case "phone":
      return phoneAnswer(value);
    case "date":
      return dateAnswer(value);
    case "checkbox": {
      const picked = Array.isArray(value) ? value.map(text).filter(Boolean) : [];

      return picked.length ? picked : null;
    }
    case "file":
      return Array.isArray(value) && value.length ? value : null;
    default:
      return text(String(value ?? "")) || null;
  }
}

const JOTFORM_TYPES = {
  fullName: "control_fullname",
  address: "control_address",
  phone: "control_phone",
  date: "control_datetime",
  checkbox: "control_checkbox",
  radio: "control_radio",
  select: "control_dropdown",
  file: "control_fileupload",
  email: "control_email",
  number: "control_number",
  textarea: "control_textarea",
  text: "control_textbox",
};

// form: an entry of PUBLIC_FORMS. answers: already checked (cleanAnswers).
// applicationId: the id from the link (?applicationId=), or null.
export function toJotformAnswers(form, answers, { applicationId = null } = {}) {
  const result = {};
  let order = 0;

  // "Other" boxes: the typed text goes into the checkbox answer, as Jotform's.
  const folds = form.questions.filter((question) => question.foldInto && isVisible(question, answers) && text(answers[question.key]));
  const foldFor = (key) => folds.find((question) => question.foldInto === key);

  for (const question of form.questions) {
    order += 1;

    if (!question.qid || question.type === "note" || question.type === "agreement" || !isVisible(question, answers)) continue;

    let answer = answerOf(question, answers[question.key]);

    if (question.type === "checkbox" && answer) {
      const fold = foldFor(question.key);

      if (fold) answer = answer.map((option) => (option === OTHER ? `${OTHER}: ${text(answers[fold.key])}` : option));
    }

    if (answer === null) continue;

    result[question.qid] = {
      name: question.key,
      type: question.jotformType ?? JOTFORM_TYPES[question.type] ?? "control_textbox",
      text: question.label,
      order: String(order),
      answer,
    };
  }

  if (form.applicationIdQid && /^\d+$/.test(String(applicationId ?? ""))) {
    result[form.applicationIdQid] = { name: "ibktApplicationId", type: "control_textbox", text: "ibktApplicationId", order: String(order + 1), answer: String(applicationId) };
  }

  return result;
}
