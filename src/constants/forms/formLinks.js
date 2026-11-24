// The public forms listed on the Forms page (sidebar > Forms), where staff
// copy or open the link to send to people. To list another form, add an
// entry: `path` is the page's route in this app (no host - the page adds
// the app's own address). The four adoption forms are copies of the client's
// Jotform forms (constants/forms/publicForms.js, docs/public-forms.md), at
// /forms/<key>.
export const FORM_LINKS = [
  {
    key: "rescuer-application",
    title: "Rescuer Application",
    description: "A new rescuer applies to work with IBKT. The application is approved automatically and the rescuer is signed in. An Admin only reviews it if the account could not be created.",
    path: "/become-a-rescuer",
  },
  {
    key: "foster-application",
    title: "Foster Application",
    description: "A new foster applies to work with IBKT: the Foster Compliance and Safeguarding Form. An Admin reviews it, then approves or rejects it.",
    path: "/become-a-foster",
  },
  {
    key: "pre-adoption",
    title: "Pre-Adoption Form",
    description: "An applicant tells us about themselves and the cat they are interested in. It creates a new application.",
    path: "/forms/pre-adoption",
  },
  {
    key: "adoption-form",
    title: "Adoption Form and References",
    description: "The second step for UK and other non-UAE applicants, with three personal references. It is added to the applicant's application.",
    path: "/forms/adoption-form",
  },
  {
    key: "uae-adoption-form",
    title: "UAE Adoption Form & Agreement",
    description: "The second step for applicants in the UAE, including the signed adoption agreement. It is added to the applicant's application.",
    path: "/forms/uae-adoption-form",
  },
  {
    key: "reference-check",
    title: "Reference Check",
    description: "A referee answers questions about an applicant. It is added to the applicant's application, under References.",
    path: "/forms/reference-check",
  },
];
