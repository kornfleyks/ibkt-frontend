// The public forms (docs/public-forms.md) talk to the server directly: there is
// no sign-in, like the rescuer application form (RescuerApplicationService.js).
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

async function readResult(response) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.error || "Request failed.");

    error.fields = result.fields;
    throw error;
  }

  return result;
}

// One chosen file -> its token ("ibkt-upload:<id>"), which the answers carry.
export async function uploadPublicFormFile(file) {
  const body = new FormData();

  body.append("file", file);

  const { token } = await readResult(await fetch(`${SERVER_URL}/api/public/form-uploads`, { method: "POST", body }));

  return token;
}

// answers: { questionKey: value }, files already uploaded (their tokens).
// applicationId: from the link (?applicationId=), when the form came from "Send Adoption Form".
export async function submitPublicForm(formKey, answers, { applicationId = null, website = "" } = {}) {
  return readResult(
    await fetch(`${SERVER_URL}/api/public/forms/${encodeURIComponent(formKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, applicationId, website }),
    }),
  );
}
