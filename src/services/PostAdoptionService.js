import { mondayRequest, serverGet, serverPost, serverUpload, serverDelete } from "./MondayService";
import { isDatabaseBoard } from "./DatabaseBoardsService";
import { POST_ADOPTION } from "../constants/boards/postAdoption";
import { mapPostAdoption } from "./mappers/PostAdoptionMapper";

// From the database (server/readOnlyBoards.js) when the server has the
// "post_adoption" board switched on, otherwise from Monday as before.
export async function getPostAdoptionCases() {
  if (await isDatabaseBoard("post_adoption")) {
    return serverGet("/api/post-adoption");
  }

  const query = `
        query ($boardId: ID!) {
            boards(ids: [$boardId]) {
                items_page(limit: 500) {
                    items {
                        id
                        name
                        column_values {
                            id
                            type
                            text
                            value
                        }
                    }
                }
            }
        }
    `;

  const data = await mondayRequest(query, {
    boardId: POST_ADOPTION.BOARD_ID,
  });

  return data.boards[0].items_page.items.map(mapPostAdoption);
}

// --- One application's post-adoption record (server/postAdoption/) ---
// Always through the server, which applies the check-in rules in both
// database and Monday mode. A record: see server/postAdoption/fields.js.

const base = (applicationId) => `/api/applications/${applicationId}/post-adoption`;

// { record | null, photos: [file details] }
export function getApplicationPostAdoption(applicationId) {
  return serverGet(base(applicationId));
}

// { adoptionDate, arrivalDate? } -> { record, photos }
export function startPostAdoption(applicationId, dates) {
  return serverPost(base(applicationId), dates);
}

// Answers the saved record, including anything the rules set (due dates,
// Chase Count, Last Check-In Sent, ...).
export async function updatePostAdoption(applicationId, recordId, changes) {
  const { record } = await serverPost(`${base(applicationId)}/${recordId}`, changes);

  return record;
}

// [{ id, name, role }]: active Admins and the application's Case Owner.
export async function getPostAdoptionOwnerOptions(applicationId) {
  const { users } = await serverGet(`${base(applicationId)}/owner-options`);

  return users;
}

export async function uploadPostAdoptionPhoto(applicationId, recordId, file, { note }) {
  const formData = new FormData();
  formData.append("note", note ?? "");
  formData.append("file", file);

  const { photo } = await serverUpload(`${base(applicationId)}/${recordId}/photos`, formData);

  return photo;
}

export function deletePostAdoptionPhoto(applicationId, recordId, assetId) {
  return serverDelete(`${base(applicationId)}/${recordId}/photos/${assetId}`);
}
