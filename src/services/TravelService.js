import { mondayRequest, serverGet } from "./MondayService";
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
