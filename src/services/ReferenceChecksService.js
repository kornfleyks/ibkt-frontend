import { serverGet } from "./MondayService";

// The referees' Reference Check answers about an application
// (server/referenceChecks/routes.js). Each check:
// { id, submissionId, refereeSlot, referee: { name, email, phone },
//   candidateName, criminalHistory, answers: [{ qid, question, answer }],
//   signatureUrl, signedOn, submittedAt, receivedAt }.

export async function getReferenceChecks(applicationId) {
  const { checks } = await serverGet(`/api/applications/${applicationId}/reference-checks`);

  return checks;
}
