import { mondayRequest, serverGet } from "./MondayService";
import { isDatabaseBoard } from "./DatabaseBoardsService";
import { RESCUERS } from "../constants/boards/rescuers";

// From the database (server/readOnlyBoards.js) when the server has the
// "rescuers" board switched on, otherwise from Monday as before.
export async function getRescuers() {
  if (await isDatabaseBoard("rescuers")) {
    return serverGet("/api/rescuers");
  }

  const query = `
        query ($boardId: ID!) {
            boards(ids: [$boardId]) {
                items_page(limit: 500) {
                    items {
                        id
                        name
                    }
                }
            }
        }
    `;

  const data = await mondayRequest(query, {
    boardId: RESCUERS.BOARD_ID,
  });

  return data.boards[0].items_page.items.map((item) => ({
    id: item.id,
    name: item.name,
  }));
}
