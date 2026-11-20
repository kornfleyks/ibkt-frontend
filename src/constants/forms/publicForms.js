// The public forms (no sign-in) that copy a Jotform form: the Pre-Adoption
// Form, the Adoption Form and References, the UAE Adoption Form & Agreement
// and the Reference Check (docs/public-forms.md). Each entry has the same
// shape, so one page (src/pages/PublicForm) draws any of them and one server
// route (server/publicForms) checks and saves any of them.
//
//   key        the form's address: /forms/<key>
//   formId     the Jotform form it copies (its handler in server/jotform
//              applies a submission to an application)
//   pages      [{ title, questions }], see preAdoptionForm.js
//   applicationIdQid  the hidden question the link's ?applicationId= fills
//              (the second-stage forms), or absent

import { PRE_ADOPTION_FORM_ID, PRE_ADOPTION_PAGES, PHOTO_EXTENSIONS, answersErrors } from "./preAdoptionForm.js";
import { ADOPTION_REFERENCES_FORM } from "./adoptionReferencesForm.js";
import { UAE_ADOPTION_FORM } from "./uaeAdoptionForm.js";
import { REFERENCE_CHECK_FORM } from "./referenceCheckForm.js";

const PRE_ADOPTION_PUBLIC_FORM = {
  key: "pre-adoption",
  formId: PRE_ADOPTION_FORM_ID,
  title: "Pre-Adoption Form",
  heading: "Pre-Adoption Form",
  submitLabel: "Submit Application",
  successMessage:
    "Thank you so much for wanting to home a rescued cat! We have received your application. We are all volunteers, so it may take approximately 48 hours or more for us to get back to you.",
  pages: PRE_ADOPTION_PAGES,
};

function withQuestions(form) {
  return { ...form, questions: form.pages.flatMap((page) => page.questions) };
}

export const PUBLIC_FORMS = Object.fromEntries(
  [PRE_ADOPTION_PUBLIC_FORM, ADOPTION_REFERENCES_FORM, UAE_ADOPTION_FORM, REFERENCE_CHECK_FORM].map((form) => [form.key, withQuestions(form)]),
);

// { key: message } for every problem in `answers` for this form.
export function publicFormErrors(form, answers) {
  return answersErrors(answers, form.questions);
}

// What the public upload route accepts, as on Jotform (about 10 MB a file),
// and how many files one question and one submission may carry.
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const UPLOAD_MAX_FILES_PER_QUESTION = 10;
export const UPLOAD_MAX_FILES_PER_FORM = 20;
// Jotform's list without "html": a page an applicant uploads would be opened by staff.
export const UPLOAD_EXTENSIONS = PHOTO_EXTENSIONS.filter((extension) => extension !== "html");
