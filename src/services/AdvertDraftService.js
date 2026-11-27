import { serverGet, serverPost } from "./MondayService";

// The AI's draft advert of a cat (see server/adverts/). { enabled, draft },
// where draft is null when none was made yet.
export function getAdvertDraft(catId) {
  return serverGet(`/api/cats/${encodeURIComponent(catId)}/advert-draft`);
}

// Saves the text a person wrote or changed as the newest draft.
export function saveAdvertDraftEdit(catId, body) {
  return serverPost(`/api/cats/${encodeURIComponent(catId)}/advert-draft/edit`, { body });
}

// Asks the AI for a new draft; takes several seconds.
export function regenerateAdvertDraft(catId) {
  return serverPost(`/api/cats/${encodeURIComponent(catId)}/advert-draft`, {});
}
