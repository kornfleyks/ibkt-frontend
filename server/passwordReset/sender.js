// Delivers reset codes - the only file that knows how the email is sent,
// so moving to an email service later only changes this module.
//
// The server can't send email itself, so this submits the client's hidden
// "IBKT Reset Password" Jotform form, whose Autoresponder emails the user a
// link with the code (see README "Password reset"). It posts to the form's
// public submit URL the way a browser does: submissions made through the
// Jotform API are stored but send no emails. Not an official API - if
// Jotform adds a captcha or changes its form, sends fail (and are logged).

const SUBMIT_URL = "https://submit.jotform.com/submit";
const FORM_ID = process.env.JOTFORM_RESET_FORM_ID;

// The form's field names, q<question id>_<field name>, as its page has them.
const FIELDS = {
  email: "q3_email",
  code: "q4_resetCode",
};

export function isSenderConfigured() {
  return Boolean(FORM_ID);
}

export async function sendResetCode({ email, code }) {
  const body = new URLSearchParams({
    formID: FORM_ID,
    // Jotform's anti-spam check: its page script sets "<id>-<id>", and the
    // "website" honeypot must stay empty.
    simple_spc: `${FORM_ID}-${FORM_ID}`,
    website: "",
    submitSource: "form",
    [FIELDS.email]: email,
    [FIELDS.code]: code,
  });

  const res = await fetch(`${SUBMIT_URL}/${encodeURIComponent(FORM_ID)}`, {
    method: "POST",
    body,
    redirect: "manual",
  });

  if (res.status >= 400) {
    throw new Error(`Jotform refused the reset form submission (${res.status} ${res.statusText}).`);
  }
}
