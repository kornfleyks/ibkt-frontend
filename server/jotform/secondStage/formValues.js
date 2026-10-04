import { uploadUrls } from "../uploads.js";

// Shared by the second-stage forms (the UK/US Adoption Form and References,
// the UAE Adoption Form & Agreement): a submission as Jotform stores it
// ({ qid: { answer, ... } }) -> what to write on the applicant's
// application. Pure: the handler reads the application and writes. Each
// form's config (adoptionReferences/form.js, uae/form.js) says which
// column each answer goes to and what else it fills.

const OTHER = "Other";

export function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Summary lines are one line each, so a section ends at the first blank line.
export function oneLine(value) {
  return clean(value).replace(/\s*\n\s*/g, " ");
}

export function fullNameText(value) {
  return [clean(value?.first), clean(value?.middle), clean(value?.last)].filter(Boolean).join(" ");
}

export function addressText(value) {
  const country = clean(value?.country);
  const place = [clean(value?.state), clean(value?.postal)].filter(Boolean).join(" ");

  return [value?.addr_line1, value?.addr_line2, value?.city, place, country].map(clean).filter(Boolean).join(", ");
}

export function phoneText(value) {
  if (typeof value === "string") return clean(value);

  return clean(value?.full) || [clean(value?.area), clean(value?.phone)].filter(Boolean).join(" ");
}

// Ticked options, "Other" carrying its explanation.
export function choicesText(values, otherText) {
  const picked = (Array.isArray(values) ? values : [values]).map(clean).filter(Boolean);
  const other = clean(otherText);
  const text = picked.map((option) => (option === OTHER && other ? `${OTHER}: ${other}` : option));

  if (other && !picked.includes(OTHER)) text.push(`${OTHER}: ${other}`);

  return text.join(", ");
}

// A referee as the Referee columns hold it: "Name, phone, email".
export function referenceText(name, phone, email) {
  return [clean(name), phoneText(phone), clean(email)].filter(Boolean).join(", ");
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// A date answer ({ month, day, year }, month as a number or a name, or
// text) as YYYY-MM-DD when complete, else as given.
export function dateText(value) {
  if (typeof value === "string") return clean(value);

  const { year, month, day } = value ?? {};
  const monthNumber = /^\d+$/.test(String(month ?? "")) ? Number(month) : MONTHS.indexOf(String(month ?? "").trim().toLowerCase()) + 1;

  if (!year || !day || !monthNumber) return [day, month, year].map((part) => clean(String(part ?? ""))).filter(Boolean).join(" ");

  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// "Question: answer" lines, skipping empty answers.
export function lines(pairs) {
  return pairs.filter(([, answer]) => oneLine(answer)).map(([question, answer]) => `${question}: ${oneLine(answer)}`);
}

// A long-text summary column with one submission's section put in (or
// replaced, on an edit, or removed when it has no lines left). Text
// outside the section - a volunteer's, or other forms' - is kept as is.
export function withSection(existing, heading, sectionLines) {
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

// One answer as the text its column holds, by the column's `format`.
function answerText(column, raw) {
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
    case "date":
      return dateText(first);
    case "withNote":
      return [Array.isArray(first) ? first.map(clean).join(", ") : clean(first), oneLine(second)].filter(Boolean).join(" - ");
    case "files":
      return "";
    default:
      return Array.isArray(first) ? first.map(clean).filter(Boolean).join(", ") : clean(first);
  }
}

// Answers:
//   applicationIdHint  the hidden application id (Send Adoption Form link), or null
//   email, name        who filled it in
//   ownColumns         { columnId: value } one column per answer, Monday format
//                      (with clearEmpty, empty answers are null = clear),
//                      plus the form's `alwaysColumns`
//   fillIfEmpty        [{ field, columnId, value }] for application fields that
//                      only get this form's answer while they are empty
//   sections           { field: { columnId, lines } } for the summary columns
//   idDocumentUrls     the ID uploads (Jotform links)
export function toApplicationChanges(form, submissionAnswers, { clearEmpty = false } = {}) {
  const byQid = submissionAnswers ?? {};
  const raw = (qid) => byQid[qid]?.answer;
  const ownColumns = {};

  for (const column of form.columns) {
    if (column.type === "file") continue;

    const text = answerText(column, raw);
    const columnId = form.columnIds[column.key];

    if (!text) {
      if (clearEmpty) ownColumns[columnId] = null;
      continue;
    }

    ownColumns[columnId] = column.type === "status" ? { label: text } : column.type === "long_text" ? { text } : text;
  }

  Object.assign(ownColumns, form.alwaysColumns?.(raw) ?? {});

  const hint = clean(String(raw(form.qid.applicationId) ?? ""));

  return {
    applicationIdHint: /^\d+$/.test(hint) ? hint : null,
    email: clean(raw(form.qid.email)),
    name: fullNameText(raw(form.qid.fullName)),
    ownColumns,
    fillIfEmpty: form.fillIfEmpty(raw).filter((entry) => entry.value !== undefined),
    sections: form.sections(raw),
    idDocumentUrls: form.idUploadQids.flatMap((qid) => uploadUrls(raw(qid))),
  };
}
