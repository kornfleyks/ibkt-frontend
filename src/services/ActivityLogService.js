import { mondayRequest } from "./MondayService";
import { ACTIVITY_LOG } from "../constants/boards/activityLog";
import { mapActivityLogEntry } from "./mappers/ActivityLogMapper";

const LIST_QUERY = `
  query ($boardId: ID!) {
    boards(ids: [$boardId]) {
      items_page(limit: 500) {
        items {
          id
          column_values {
            id
            text
          }
        }
      }
    }
  }
`;

// Same "fetch the board, filter/sort in JS" approach already used elsewhere
// in this app (auth.js's getAllAuthUsers, CatsService.getCats) rather than
// fighting Monday's text-column query filters for something this small.
// Item ids are monotonically increasing, so sorting by id descending is a
// more reliable "newest first" than parsing the Timestamp column's text.
async function fetchAllActivity() {
  const data = await mondayRequest(LIST_QUERY, { boardId: ACTIVITY_LOG.BOARD_ID });
  const items = data.boards[0].items_page.items;

  return items.map(mapActivityLogEntry).sort((a, b) => Number(b.id) - Number(a.id));
}

export async function getAllActivity() {
  return fetchAllActivity();
}

export async function getActivityForItem(boardId, itemId) {
  const all = await fetchAllActivity();

  return all.filter(
    (entry) => entry.boardId === String(boardId) && entry.itemId === String(itemId),
  );
}
