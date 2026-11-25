// The rescuer portal's limits (docs/rescuer-onboarding.md), shared by the
// Add Cat page (checks files as they are chosen) and the server (enforces
// them): per-cat caps keep uploads from filling Monday's file storage.
const MB = 1024 * 1024;

export const PORTAL_FILE_RULES = {
  photos: { label: "Photos", max: 5, maxBytes: 10 * MB, extensions: ["jpg", "jpeg", "png", "gif", "webp", "heic"], accept: "image/*" },
  videos: { label: "Videos", max: 5, maxBytes: 20 * MB, extensions: ["mp4", "mov", "m4v", "webm"], accept: "video/*" },
  medicalDocuments: { label: "Medical documents", max: 5, maxBytes: 10 * MB, extensions: ["pdf", "jpg", "jpeg", "png", "doc", "docx"], accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx" },
};

// How many cats one rescuer may add in a day.
export const NEW_CATS_PER_DAY = 20;

// Where a rescuer is told to turn for a change (they can't edit cats).
export const PORTAL_CONTACT_EMAIL = "support@ittybittykittytails.co.uk";

// The first problem with `file` for `kind` (a PORTAL_FILE_RULES key), or null.
export function fileProblem(kind, file) {
  const rule = PORTAL_FILE_RULES[kind];
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!rule.extensions.includes(extension)) return `"${file.name}" isn't an allowed file type (${rule.extensions.join(", ")}).`;
  if (file.size > rule.maxBytes) return `"${file.name}" is larger than ${rule.maxBytes / MB} MB.`;

  return null;
}
