// The client's Jotform forms the app knows about, by Jotform form id (see
// docs/jotform-research.md). "kind" picks what happens to a submission:
//
//   new_application     creates an application
//   adoption_references updates the applicant's application (by email)
//   reference_check     updates the candidate's application (by name)
//   contract            contract sent / signed on the adopter's application
//   log_only            kept in jotform_submissions only, for now
//
// A submission from a form not listed here is kept as log_only too.

export const JOTFORM_FORMS = {
  "203096212272447": { kind: "new_application", name: "Pre-Adoption Form" },
  "202981102716450": { kind: "new_application", name: "UAE Adoption Form & Agreement" },
  "211304838746458": { kind: "adoption_references", name: "Adoption Form and References" },
  "220642582493458": { kind: "reference_check", name: "Reference Check - IBKT" },
  "203072984903054": { kind: "contract", name: "Pet Adoption Contract - England & Wales only" },
  "220265883187362": { kind: "contract", name: "Pet Adoption Contract - Scotland only" },
  "223027110333438": { kind: "contract", name: "Pet Adoption Contract - USA only" },
  "223056984117459": { kind: "contract", name: "USA 1 Pet Adoption Contract" },
  "201745315590453": { kind: "log_only", name: "Foster Agreement" },
  "260843004451044": { kind: "log_only", name: "IBKT Foster Compliance & Safeguarding Form" },
  "221387152092453": { kind: "log_only", name: "Cat Passport" },
  "211112902350337": { kind: "log_only", name: "Kitty Profile For Rehoming" },
  "211382887164462": { kind: "log_only", name: "Pet Surrender Form" },
};

export function formKindOf(formId) {
  return JOTFORM_FORMS[String(formId)]?.kind ?? "log_only";
}
