// The second-stage Jotform forms a volunteer sends an applicant once the
// application is Active ("Send Adoption Form" on the application page,
// docs/send-adoption-form.md). UAE applicants get the all-in-one "UAE
// Adoption Form & Agreement"; everyone else the "Adoption Form and
// References". Shared by the server (builds the links) and the dialog.
//
// `fields` are the Jotform fields' unique names, used to pre-fill the link
// (https://form.jotform.com/<id>?yourFull[first]=...). When the client
// renames a field on Jotform, update it here.

export const UAE_COUNTRY = "United Arab Emirates";

// A hidden field on both forms (added by hand on Jotform) that the link
// fills with the app's application id, so the submission can be matched to
// its application even when the applicant uses another email.
// Jotform lower-cases the Unique Name it creates (q174 / q188).
export const APPLICATION_ID_FIELD = "ibktapplicationid";

export const ADOPTION_FORMS = {
  standard: {
    key: "standard",
    formId: "211304838746458",
    name: "Adoption Form and References",
    fields: { fullName: "yourFull", email: "email124", address: "yourHome", phone: "mobileNumber", cat: "whichCat" },
  },
  uae: {
    key: "uae",
    formId: "202981102716450",
    name: "UAE Adoption Form & Agreement",
    fields: { fullName: "yourFull", email: "email124", address: "yourAddress", phone: "cellPhone122", cat: "whichCats" },
  },
};

export const ADOPTION_FORM_KEYS = Object.keys(ADOPTION_FORMS);

// How a send was made. "email" (sent by the server) comes once an email
// service is connected.
export const SEND_METHODS = {
  COPY_LINK: "copy_link",
  EMAIL_CLIENT: "email_client",
};

// The form for an application's country (its name, as the Country column
// shows it) and why, for the dialog.
export function suggestedAdoptionForm(country) {
  return country?.trim() === UAE_COUNTRY
    ? { key: ADOPTION_FORMS.uae.key, reason: `Suggested because the application's country is ${UAE_COUNTRY}.` }
    : {
        key: ADOPTION_FORMS.standard.key,
        reason: country ? `Suggested because the application's country is ${country}.` : "Suggested because the application has no country.",
      };
}

// "First Middle Last" -> { first, last }: the last word is the last name.
function splitName(name) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);

  if (words.length < 2) return { first: words[0] ?? "", last: "" };

  return { first: words.slice(0, -1).join(" "), last: words[words.length - 1] };
}

// The pre-filled link for one form.
//   applicant: { applicationId, name, email, phone, city, country,
//                fullName?: { first, last }, address?: { line1, line2, city, state, postal }, cat? }
// fullName / address come from the saved Pre-Adoption answers when the
// application has them (the Address column is one joined line that can't be
// split back reliably); otherwise the name is split and only city and
// country are filled. Empty values are left out.
export function adoptionFormLink(formKey, applicant) {
  const form = ADOPTION_FORMS[formKey];

  if (!form) throw new Error(`Unknown adoption form "${formKey}".`);

  const { fields } = form;
  const name = applicant.fullName?.first || applicant.fullName?.last ? applicant.fullName : splitName(applicant.name);
  const address = applicant.address ?? {};
  const values = [
    [`${fields.fullName}[first]`, name.first],
    [`${fields.fullName}[last]`, name.last],
    [fields.email, applicant.email],
    [`${fields.address}[addr_line1]`, address.line1],
    [`${fields.address}[addr_line2]`, address.line2],
    [`${fields.address}[city]`, address.city || applicant.city],
    [`${fields.address}[state]`, address.state],
    [`${fields.address}[postal]`, address.postal],
    [`${fields.address}[country]`, applicant.country],
    // The whole international number in the number part: the forms have no
    // country-code box.
    [`${fields.phone}[phone]`, applicant.phone],
    [fields.cat, applicant.cat],
    [APPLICATION_ID_FIELD, applicant.applicationId],
  ];
  const params = new URLSearchParams();

  for (const [key, value] of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") params.set(key, String(value).trim());
  }

  return `https://form.jotform.com/${form.formId}?${params.toString()}`;
}
