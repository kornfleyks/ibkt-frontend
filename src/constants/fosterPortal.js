// The foster portal's limits (docs/foster-onboarding.md), shared by the Kitty
// Profile page (checks files as they are chosen) and the server (enforces
// them): per-cat caps keep uploads from filling Monday's file storage. The
// minimum photos and videos are the ones the Adoption Ready check needs
// (constants/catReadiness.js). The passport and the vet report are asked for
// but not required.
import { MIN_PHOTOS, MIN_VIDEOS } from "./catReadiness.js";

const MB = 1024 * 1024;

export const FOSTER_FILE_RULES = {
  photos: {
    label: "Photos",
    help: `At least ${MIN_PHOTOS} clear pictures.`,
    min: MIN_PHOTOS,
    max: 10,
    maxBytes: 10 * MB,
    extensions: ["jpg", "jpeg", "png", "gif", "webp", "heic"],
    accept: "image/*",
  },
  videos: {
    label: "Videos",
    help: `At least ${MIN_VIDEOS} videos that show how the cat behaves and interacts with people.`,
    min: MIN_VIDEOS,
    max: 5,
    maxBytes: 20 * MB,
    extensions: ["mp4", "mov", "m4v", "webm"],
    accept: "video/*",
  },
  passport: {
    label: "Pet passport",
    help: "A clear scan or photo of the passport, if the cat has one.",
    min: 0,
    max: 1,
    maxBytes: 10 * MB,
    extensions: ["pdf", "jpg", "jpeg", "png"],
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  vetReport: {
    label: "Vet report",
    help: "The vet's report, with the general health commentary. Blood test results matter for older cats and FIV+ cats.",
    min: 0,
    max: 3,
    maxBytes: 10 * MB,
    extensions: ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
    accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  },
};

export const FOSTER_FILE_KINDS = Object.keys(FOSTER_FILE_RULES);

// Where a foster is told to turn for a change (they cannot edit cats).
export const FOSTER_CONTACT_EMAIL = "support@ittybittykittytails.co.uk";

// The first problem with `file` for `kind` (a FOSTER_FILE_RULES key), or null.
export function fosterFileProblem(kind, file) {
  const rule = FOSTER_FILE_RULES[kind];
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!rule.extensions.includes(extension)) return `"${file.name}" isn't an allowed file type (${rule.extensions.join(", ")}).`;
  if (file.size > rule.maxBytes) return `"${file.name}" is larger than ${rule.maxBytes / MB} MB.`;

  return null;
}

// What is missing before the profile can be sent: [{ kind, label, need, have }]
// from the counts of files by kind ({ photos: 4, videos: 1 }).
export function missingFiles(counts) {
  return FOSTER_FILE_KINDS.filter((kind) => (counts[kind] ?? 0) < FOSTER_FILE_RULES[kind].min).map((kind) => ({
    kind,
    label: FOSTER_FILE_RULES[kind].label,
    need: FOSTER_FILE_RULES[kind].min,
    have: counts[kind] ?? 0,
  }));
}
