import { serverGet, serverPost, serverUpload, serverDelete } from "./MondayService";

// The application's Screening tab (server/screening/routes.js): call
// transcripts (uploaded files kept on Monday, pasted text in the
// database) and the home video, each with who added it and when.

const base = (applicationId) => `/api/applications/${applicationId}/screening`;

function fileForm(file, note) {
  const formData = new FormData();
  formData.append("note", note ?? "");
  formData.append("file", file);

  return formData;
}

// { calls: { 1: { files, texts }, 2: { files, texts } }, video: [files] }
export function getScreening(applicationId) {
  return serverGet(base(applicationId));
}

export async function uploadTranscriptFile(applicationId, call, file, { note } = {}) {
  const { file: saved } = await serverUpload(`${base(applicationId)}/calls/${call}/files`, fileForm(file, note));

  return saved;
}

export function deleteTranscriptFile(applicationId, call, assetId) {
  return serverDelete(`${base(applicationId)}/calls/${call}/files/${assetId}`);
}

export async function addTranscriptText(applicationId, call, text) {
  const { transcript } = await serverPost(`${base(applicationId)}/calls/${call}/texts`, { text });

  return transcript;
}

export function deleteTranscriptText(applicationId, call, transcriptId) {
  return serverDelete(`${base(applicationId)}/calls/${call}/texts/${transcriptId}`);
}

export async function uploadVideo(applicationId, file, { note } = {}) {
  const { file: saved } = await serverUpload(`${base(applicationId)}/video`, fileForm(file, note));

  return saved;
}

export function deleteVideo(applicationId, assetId) {
  return serverDelete(`${base(applicationId)}/video/${assetId}`);
}
