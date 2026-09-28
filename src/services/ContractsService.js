import { serverGet, serverUpload, serverDelete } from "./MondayService";

// An application's contract files (server/contracts.js). Each file:
// { assetId, name, url, extension, sizeBytes, documentType, note,
//   uploadedBy: { id, name, role } | null, uploadedAt }.

export async function getContracts(applicationId) {
  const { contracts } = await serverGet(`/api/applications/${applicationId}/contracts`);

  return contracts;
}

// Answers { contract, statusChanges } - statusChanges holds any contract
// status the upload set (e.g. { signedContractReceived: "Yes" }).
export async function uploadContract(applicationId, file, { documentType, note }) {
  const formData = new FormData();
  formData.append("documentType", documentType);
  formData.append("note", note ?? "");
  formData.append("file", file);

  return serverUpload(`/api/applications/${applicationId}/contracts`, formData);
}

export async function deleteContract(applicationId, assetId) {
  return serverDelete(`/api/applications/${applicationId}/contracts/${assetId}`);
}
