import { mondayRequest, serverGet, serverPost } from "./MondayService";
import { isDatabaseBoard } from "./DatabaseBoardsService";
import { TRAVEL } from "../constants/boards/travel";
import { mapTravel } from "./mappers/TravelMapper";

// From the database (server/readOnlyBoards.js) when the server has the
// "travel" board switched on, otherwise from Monday as before.
export async function getTravel() {
  if (await isDatabaseBoard("travel")) {
    return serverGet("/api/travel");
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
    boardId: TRAVEL.BOARD_ID,
  });

  return data.boards[0].items_page.items.map(mapTravel);
}

// --- One application's travel record (server/travel/) ---
// Always through the server, which applies the travel rules in both database
// and Monday mode. A record: see server/travel/fields.js.

const base = (applicationId) => `/api/applications/${applicationId}/travel`;

// { record | null }
export function getApplicationTravel(applicationId) {
  return serverGet(base(applicationId));
}

// { travelDate? } -> { record }
export function startTravel(applicationId, values) {
  return serverPost(base(applicationId), values);
}

// Answers { record }: the saved record, as the rules left it (a weight with no
// unit gets kg, clearing the weight clears the unit).
export function updateTravel(applicationId, recordId, changes) {
  return serverPost(`${base(applicationId)}/${recordId}`, changes);
}

// --- The same record from a cat's page (the Travel tab of the cat) ---
// The record of the application the cat is matched to, with the same rules and
// the same access (Admins and that application's Case Owner).

const catBase = (catId) => `/api/cats/${catId}/travel`;

// { record | null, application: { id, name } | null }. `application` is null
// for a cat that is not matched to one. Fails with status 403 for a user who
// may not see the application's travel details.
export function getCatTravel(catId) {
  return serverGet(catBase(catId));
}

// Answers { record }, like updateTravel.
export function updateCatTravel(catId, recordId, changes) {
  return serverPost(`${catBase(catId)}/${recordId}`, changes);
}
